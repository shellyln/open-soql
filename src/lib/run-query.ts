// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { PreparedQuery,
         PreparedResolver,
         PreparedFnCall,
         PreparedSubQuery,
         PreparedFieldListItem,
         PreparedCondition,
         ResolverCapabilities,
         ResolverContext,
         AggregateQueryFuncInfo,
         ScalarQueryFuncInfo,
         ImmediateScalarQueryFuncInfo,
         QueryFuncInfo,
         QueryBuilderInfoInternal }       from '../types';
import { deepCloneObject,
         isEqualComplexName,
         getTrueCaseFieldName,
         getObjectValueWithFieldNameMap } from './util';
import { callAggregateFunction,
         callScalarFunction,
         callImmediateScalarFunction,
         getGroupFieldTrueCaseName,
         isScalarFnCallable }             from './call';
import { sortRecords }                    from '../sort';
import { applyWhereConditions,
         applyHavingConditions }          from '../filters';



function filterZeroLengthCondFn(cond: PreparedCondition) {
    switch (cond.op) {
    case 'true':
        return false;
    case 'not': case 'and': case 'or':
        if (cond.operands.length === 0) {
            return false;
        }
    }

    return true;
}


function filterCondOperands(name: string[], cond: PreparedCondition) {
    cond.operands = cond.operands
    .map(x => {
        switch (typeof x) {
        case 'object':
            if (Array.isArray(x)) {
                return x;
            } else {
                if (x === null) {
                    // NOTE: never reach here.
                    return x;
                }
                switch (x.type) {
                case 'condition':
                    return pruneCondition(name, x);
                default:
                    return x;
                }
            }
        default:
            return x;
        }
    })
    .filter(x => {
        switch (typeof x) {
        case 'object':
            if (x !== null && !Array.isArray(x) && x.type === 'condition') {
                return filterZeroLengthCondFn(x);
            }
        }
        return true;
    });

    return cond;
}


function pruneConditionCheckFncall(name: string[], x: PreparedFnCall): PreparedCondition | null {
    for (const arg of x.args) {
        switch (typeof arg) {
        case 'object':
            if (arg === null) {
                // NOTE: Nothing to do.
            } else {
                switch (arg.type) {
                case 'field':
                    // TODO: Check all arguments' resolver are equal
                    if (! isEqualComplexName(name, arg.name.slice(0, arg.name.length - 1))) {
                        return ({
                            type: 'condition',
                            op: 'true',
                            operands: [],
                        });
                    } else {
                        arg.name = arg.name.slice(arg.name.length - 1); // TODO:
                    }
                    break;
                case 'fncall':
                    {
                        const tmp = pruneConditionCheckFncall(name, arg);
                        if (tmp) {
                            return tmp;
                        }
                    }
                    break;
                }
            }
            break;
        }
    }
    return null;
}


function pruneCondition(name: string[], cond: PreparedCondition): PreparedCondition {
    if (cond.operands.length) {
        const x = cond.operands[0];

        switch (typeof x) {
        case 'object':
            if (x === null) {
                // NOTE: never reach here.
                // NOTE: Nothing to do.
            } else if (Array.isArray(x)) {
                // NOTE: Nothing to do. It is data.
            } else {
                switch (x.type) {
                case 'field':
                    if (! isEqualComplexName(name, x.name.slice(0, x.name.length - 1))) {
                        return ({
                            type: 'condition',
                            op: 'true',
                            operands: [],
                        });
                    } else {
                        x.name = x.name.slice(x.name.length - 1);
                    }
                    break;
                case 'fncall':
                    {
                        const tmp = pruneConditionCheckFncall(name, x);
                        if (tmp) {
                            return tmp;
                        }
                    }
                }
            }
            break;
        }
    }

    return filterCondOperands(name, cond);
}


function collectSubQueriesFromCondition(
        subQueries: Array<{ cond: PreparedCondition, index: number, subQuery: PreparedSubQuery }>,
        cond: PreparedCondition) {

    switch (cond.type) {
    case 'condition':
        for (let i = 0; i < cond.operands.length; i++) {
            const x = cond.operands[i];

            switch (typeof x) {
            case 'object':
                if (x === null) {
                    // NOTE: never reach here.
                    // NOTE: Nothing to do.
                } else if (Array.isArray(x)) {
                    // NOTE: Nothing to do. It is data.
                } else {
                    switch (x.type) {
                    case 'condition':
                        collectSubQueriesFromCondition(subQueries, x);
                        break;
                    case 'subquery':
                        subQueries.push({cond, index: i, subQuery: x});
                        break;
                    }
                }
                break;
            }
        }
        break;
    }

    return cond;
}


async function execCondSubQueries(
        builder: QueryBuilderInfoInternal,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        tr: any,
        trOptions: any | undefined,
        condTemplate: PreparedCondition[],
        resolverData: any | null) {

    const condSubQueries: Array<{ cond: PreparedCondition, index: number, subQuery: PreparedSubQuery }> = [];

    condTemplate.forEach(x => collectSubQueriesFromCondition(condSubQueries, x));

    const condSubQueryResults =
        condSubQueries
            .map(x =>
                executeCompiledQuery(
                    builder, tr, trOptions,
                    x.subQuery.query, null, null, null, resolverData)
                .then(r => ({ cond: x.cond, index: x.index, subQuery: x.subQuery, result: r })));

    (await Promise.all(condSubQueryResults)).map(x => {
        const field = x.subQuery.query.select[0];
        let fieldName = '';

        switch (field.type) {
        case 'field':
            fieldName = field.name[field.name.length - 1];
            break;
        default:
            fieldName = field.aliasName ?? '';
            break;
        }

        if (x.result.length) {
            const fieldNameMap = new Map<string, string>(Object.keys(x.result[0]).map(x => [x.toLowerCase(), x]));

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            x.cond.operands[x.index] = x.result.map(w => getObjectValueWithFieldNameMap(fieldNameMap, w, fieldName));
        } else {
            x.cond.operands[x.index] = [];
        }
    });
}


function mapSelectFields(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        x: PreparedResolver, records: any[], isAggregation: boolean) {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const queryFieldsMapEntries:
        Array<{
            isField: boolean,
            fieldName: string,
            field: PreparedFieldListItem,
            fn: (i: number, fieldName: string, field: PreparedFieldListItem, record: any) => void,
        }> = new Array(x.queryFieldsMap.size);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fnInfos: QueryFuncInfo[] = new Array(x.queryFieldsMap.size);

    const fnScaler = (i: number, fieldName: string, field: PreparedFieldListItem, record: any) => {
        const fnInfo: ScalarQueryFuncInfo = fnInfos[i] as ScalarQueryFuncInfo;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        record[(field as PreparedFnCall).aliasName] = callScalarFunction(ctx, field as PreparedFnCall, fnInfo, 'any', record, null);
    };

    const fnImmediateScaler = (i: number, fieldName: string, field: PreparedFieldListItem, record: any) => {
        const fnInfo: ImmediateScalarQueryFuncInfo = fnInfos[i] as ImmediateScalarQueryFuncInfo;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        record[(field as PreparedFnCall).aliasName] = callImmediateScalarFunction(ctx, field as PreparedFnCall, fnInfo, 'any', record, null);
    };

    const fnNoop = (i: number, fieldName: string, field: PreparedFieldListItem, record: any) => void 0;

    {
        let i = 0;
        for (const ent of x.queryFieldsMap.entries()) {
            const [fieldName, field] = ent;
            switch (field.type) {
            case 'field':
                queryFieldsMapEntries[i] = { isField: true, fieldName, field, fn: fnNoop };
                break;
            case 'fncall':
                // NOTE: If aggregation, function will be called at `aggregateFields()`.
                if (isAggregation) {
                    queryFieldsMapEntries[i] = { isField: false, fieldName, field, fn: fnNoop };
                } else {
                    const fnNameI = field.fn.toLowerCase();
                    const fnInfo = ctx.functions.find(x => x.name.toLowerCase() === fnNameI);

                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    fnInfos[i] = fnInfo!;

                    switch (fnInfo?.type) {
                    case 'scalar':
                        queryFieldsMapEntries[i] = { isField: false, fieldName, field, fn: fnScaler };
                        break;
                    case 'immediate-scalar':
                        queryFieldsMapEntries[i] = { isField: false, fieldName, field, fn: fnImmediateScaler };
                        break;
                    default:
                        queryFieldsMapEntries[i] = { isField: false, fieldName, field, fn: fnNoop };
                        break;
                    }
                }
                break;
            default:
                queryFieldsMapEntries[i] = { isField: false, fieldName, field, fn: fnNoop };
                break;
            }
            i++;
        }
    }

    for (const record of records) {
        for (let i = 0; i < queryFieldsMapEntries.length; i++) {
            const { isField, fieldName, field, fn } = queryFieldsMapEntries[i];

            if (isField) {
                // NOTE: Inline expansion

                if(field.aliasName) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                    record[field.aliasName!] = record[fieldName];
                }
            } else {
                fn(i, fieldName, field, record);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return records;
}


function groupRecords(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>, groupBy: string[],
        x: PreparedResolver, records: any[]) {

    if (records.length === 0) {
        return [];
    }
    if (records.length === 1 || groupBy.length === 0) {
        return [records];
    }

    const result = new Map<string, any[]>();

    if (records.length) {
        let i = 0;
        const fieldNameMap = new Map<string, string>(Object.keys(records[0]).map(x => [x.toLowerCase(), x]));

        for (const record of records) {
            const key: any[] = [];
            for (const k of groupBy) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                let v = getObjectValueWithFieldNameMap(fieldNameMap, record, k);
                if (v === null || v === void 0) {
                    v = `__$$GENSYM_VT4iHbNbZW3C7taC7J6bx8pruw40cX5X$$_${i++}`;
                }
                key.push(v);
            }

            const keystr = JSON.stringify(key);
            if (result.has(keystr)) {
                const a = result.get(keystr);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                a!.push(record);
            } else {
                result.set(keystr, [record]);
            }
        }
    }

    return Array.from(result.values());
}


function aggregateFields(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>, groupBy: string[],
        x: PreparedResolver, records: any[][]) {

    const result: any[] = [];
    if (! records.length) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return result;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const firstRec = records[0][0];
    const groupFields = new Map<string, string>(
        groupBy.map(w => [w.toLowerCase(), getTrueCaseFieldName(firstRec, w) ?? '']));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const queryFieldsMapEntries:
        Array<{
            isField: boolean,
            field: PreparedFieldListItem,
            trueCaseName: string,
            fn: (i: number, field: PreparedFieldListItem, g: any[], agg: any) => void,
        }> = new Array(x.queryFieldsMap.size);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fnInfos: QueryFuncInfo[] = new Array(x.queryFieldsMap.size);

    const fnAggregate = (i: number, field: PreparedFieldListItem, g: any[], agg: any) => {
        const fnInfo: AggregateQueryFuncInfo = fnInfos[i] as AggregateQueryFuncInfo;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        agg[(field as PreparedFnCall).aliasName] = callAggregateFunction(ctx, field as PreparedFnCall, fnInfo, 'any', g);
    };

    const fnImmediateScalar = (i: number, field: PreparedFieldListItem, g: any[], agg: any) => {
        const fnInfo: ImmediateScalarQueryFuncInfo = fnInfos[i] as ImmediateScalarQueryFuncInfo;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        agg[(field as PreparedFnCall).aliasName] = callImmediateScalarFunction(ctx, field as PreparedFnCall, fnInfo, 'any', null, g);
    };

    const fnScalar = (i: number, field: PreparedFieldListItem, g: any[], agg: any) => {
        const fnInfo: ScalarQueryFuncInfo = fnInfos[i] as ScalarQueryFuncInfo;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        agg[(field as PreparedFnCall).aliasName] = callScalarFunction(ctx, field as PreparedFnCall, fnInfo, 'any', g[0], g);
    };

    const fnNoop = (i: number, field: PreparedFieldListItem, g: any[], agg: any) => void 0;

    {
        let i = 0;
        for (const ent of x.queryFieldsMap.entries()) {
            const [, field] = ent;
            switch (field.type) {
            case 'field':
                {
                    const trueCaseName = getGroupFieldTrueCaseName(groupFields, field.name[field.name.length - 1]);
                    if (! trueCaseName) {
                        throw new Error(`${field.name.join('.')} is not allowed. Aggregate function is needed.`);
                    }
                    queryFieldsMapEntries[i] = {
                        isField: true,
                        field,
                        trueCaseName,
                        fn: fnNoop,
                    };
                }
                break;
            case 'fncall':
                {
                    const fnNameI = field.fn.toLowerCase();
                    const fnInfo = ctx.functions.find(x => x.name.toLowerCase() === fnNameI);

                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    fnInfos[i] = fnInfo!;

                    switch (fnInfo?.type) {
                    case 'aggregate':
                        queryFieldsMapEntries[i] = {
                            isField: false,
                            field,
                            trueCaseName: '',
                            fn: fnAggregate,
                        };
                        break;
                    case 'immediate-scalar':
                        queryFieldsMapEntries[i] = {
                            isField: false,
                            field,
                            trueCaseName: '',
                            fn: fnImmediateScalar,
                        };
                        break;
                    case 'scalar':
                        if (! isScalarFnCallable(ctx, groupFields, field.args)) {
                            throw new Error(`${field.aliasName ?? '(unnamed)'} is not allowed. Aggregate function is needed.`);
                        }
                        queryFieldsMapEntries[i] = {
                            isField: false,
                            field,
                            trueCaseName: '',
                            fn: fnScalar,
                        };
                        break;
                    default:
                        throw new Error(`${field.aliasName ?? '(unnamed)'} is not allowed. Aggregate function is needed.`);
                    }
                }
                break;
            default:
                queryFieldsMapEntries[i] = {
                    isField: false,
                    field,
                    trueCaseName: '',
                    fn: fnNoop,
                };
                break;
            }
            i++;
        }
    }

    for (const g of records) {
        const agg = {};
        for (let i = 0; i < queryFieldsMapEntries.length; i++) {
            const { isField, field, trueCaseName, fn } = queryFieldsMapEntries[i];

            if (isField) {
                // NOTE: Inline expansion

                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                agg[trueCaseName] = g[0][trueCaseName];

                if (field.aliasName) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    agg[field.aliasName] = g[0][trueCaseName];
                }
            } else {
                fn(i, field, g, agg);
            }
        }
        result.push(agg);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
}


function getRemovingFields(x: PreparedResolver, records: any[], isAggregation: boolean) {
    const removingFields = new Set<string>();
    if (records.length) {
        const requestedFields = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const rec = records[0];
        for (const ent of x.queryFieldsMap.entries()) {
            const f = ent[1];
            if (isAggregation && f.type === 'field' && f.aliasName) {
                requestedFields.add(f.aliasName);
            } else {
                const name = getTrueCaseFieldName(rec, ent[0]);
                if (name) {
                    requestedFields.add(name);
                }
            }
        }
        for (const k of Object.keys(rec)) {
            if (! requestedFields.has(k)) {
                removingFields.add(k);
            }
        }
    }
    return removingFields;
}


function getResolversInfo(builder: QueryBuilderInfoInternal, resolverNames: Map<string, string>, x: PreparedResolver, i: number) {
    const parentType: ('master' | 'detail') = i === 0 ? 'master' : 'detail';
    const parentKey = JSON.stringify(x.name.slice(0, x.name.length - 1));
    const currentKey = JSON.stringify(x.name);
    const resolverName = x.resolverName ?? '';
    const parentResolverName = resolverNames.get(parentKey);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const masterRelationshipInfo = (
        (i === 0 ?
            (
                // for subquery's primary resolver

                (builder.relationships[resolverName] ?? {})
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                [parentResolverName!] as any
            ) : (
                // for detail->master relationship

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                (builder.relationships[parentResolverName!] ?? {})
                [resolverName] as any
            )
        ) ?? {});

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const foreignIdField = (typeof masterRelationshipInfo === 'object' && masterRelationshipInfo.id)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ? masterRelationshipInfo.id as string
        : i === 0
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ? builder.rules.foreignIdFieldName(parentResolverName!)
            : builder.rules.foreignIdFieldName(resolverName) ;

    const parentIdFieldName = parentResolverName ? builder.rules.idFieldName(parentResolverName) : void 0;
    const currentIdFieldName = builder.rules.idFieldName(resolverName);

    return ({
        parentType,
        parentKey,
        currentKey,
        resolverName,
        parentResolverName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        masterRelationshipInfo,
        foreignIdField,
        parentIdFieldName,
        currentIdFieldName,
    });
}


export async function executeCompiledQuery(
        builder: QueryBuilderInfoInternal,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        tr: any,
        trOptions: any | undefined,
        query: PreparedQuery,
        parent: any | null,
        parentQueriedRecords: Map<string, any[]> | null,
        parentResolverNames: Map<string, string> | null,
        parentResolverData: any | null
        ): Promise<any[]> {

    let primaryRecords: any[] | undefined;
    let primaryCapabilities: ResolverCapabilities | undefined;

    const queriedRecords = parentQueriedRecords ?? new Map<string, any[]>();
    const resolverNames = parentResolverNames ?? new Map<string, string>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const resolverData = parentResolverData ?? {};

    if (!parent && builder.events.beginExecute) {
        await builder.events.beginExecute({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            resolverData,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            transactionData: tr,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            transactionOptions: trOptions,
        });
    }

    try {
        // TODO: Move to `compile` phase

        const condWhereTemplate = query.where ?
            deepCloneObject(query.where) : [];
        const condHavingTemplate = query.having ?
            deepCloneObject(query.having) : [];

        await execCondSubQueries(builder, tr, trOptions, condWhereTemplate, resolverData);
        await execCondSubQueries(builder, tr, trOptions, condHavingTemplate, resolverData);

        const removingFieldsAndRecords: Array<[Set<string>, any[]]> = [];
        const removingFieldsMap = new Map<string, Set<string>>();

        for (let i = 0; i < query.from.length; i++) {
            const x = query.from[i];

            const {
                parentType,
                parentKey,
                currentKey,
                resolverName,
                parentResolverName,
                foreignIdField,
                parentIdFieldName,
                currentIdFieldName,
            } = getResolversInfo(builder, resolverNames, x, i);

            if (! x.resolver) {
                throw new Error(`Resolver name ${x.name.join('.')} is not resolved.`);
            }

            let records: any[] = [];
            const parentRecords = queriedRecords.get(parentKey);

            const hasAliasNameCond = (x.condAliasFields.size > 0) ? true : false;
            const isAggregation = (i === 0 && query.groupBy) ? true : false;

            const queryFields =
                Array.from(x.queryFields.values());
            const condFields =
                Array.from(x.condFields.values());
            const havingCondFields =
                Array.from(x.havingCondFields.values());
            const groupFields: string[] =
                (i === 0 && query.groupBy) ? query.groupBy : []; // NOTE: condition is same as `isAggregation`
            const sortFields =
                Array.from(x.sortFieldNames.values());
            const relationshipIdFields =
                Array.from(x.relationshipIdFields.values());

            const resolvingFields =
                Array.from(
                    new Set<string>(queryFields
                        .concat(condFields)
                        .concat(havingCondFields)
                        .concat(builder.rules.idFieldName ? [builder.rules.idFieldName(resolverName)] : [])
                        .concat(groupFields)
                        .concat(sortFields)
                        .concat(relationshipIdFields)
                    ).values());

            const condWhere = deepCloneObject(condWhereTemplate)
                .map(cond => pruneCondition(x.name, cond))
                .filter(filterZeroLengthCondFn);
            const condHaving = deepCloneObject(condHavingTemplate)
                .map(cond => pruneCondition(x.name, cond))
                .filter(filterZeroLengthCondFn);

            const ctxGen: Omit<ResolverContext, 'resolverCapabilities'> = {
                functions: builder.functions,
                query,
                graphPath: x.name,
                resolverName,
                parentResolverName,
                parentType,
                foreignIdField,
                masterIdField: i === 0 ? parentIdFieldName : currentIdFieldName,
                detailIdField: i === 0 ? currentIdFieldName : parentIdFieldName,
                parentRecords,
                conditions: condWhere,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                resolverData,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                transactionData: tr,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                transactionOptions: trOptions,
            };

            if (i === 0) {
                const ctx: ResolverContext = {
                    ...ctxGen,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    parent,
                    resolverCapabilities: {
                        filtering: false,
                        sorting: false,
                        limit: false,
                        offset: false,
                    },
                };

                records = await x.resolver(
                    resolvingFields,
                    hasAliasNameCond ? [] : condWhere,
                    (isAggregation || hasAliasNameCond) ? null : (query.limit ?? null),
                    (isAggregation || hasAliasNameCond) ? null : (query.offset ?? null),
                    ctx,
                );
                primaryCapabilities = ctx.resolverCapabilities;

                if (hasAliasNameCond) {
                    primaryCapabilities.filtering = false;
                    primaryCapabilities.limit = false;
                    primaryCapabilities.offset = false;
                    primaryCapabilities.sorting = false;
                }

                if (hasAliasNameCond) {
                    records = mapSelectFields(ctxGen, x, records, isAggregation);
                }

                if (! ctx.resolverCapabilities.filtering) {
                    records = applyWhereConditions(ctxGen, condWhere, records);
                }

                if (! hasAliasNameCond) {
                    records = mapSelectFields(ctxGen, x, records, isAggregation);
                }

                if (isAggregation) {
                    // TODO: `count()` on non-aggregation query

                    primaryCapabilities.limit = false;
                    primaryCapabilities.offset = false;
                    primaryCapabilities.sorting = false;

                    const grouped = groupRecords(ctxGen, groupFields, x, records);
                    const filteredGrouped = applyHavingConditions(ctxGen, condHaving, grouped);
                    records = aggregateFields(ctxGen, groupFields, x, filteredGrouped);
                }

                primaryRecords = records;
            } else if (parentRecords && parentRecords.length) {
                // Get master relationships.

                // For N+1 Query problem
                if (builder.events.beforeMasterSubQueries) {
                    await builder.events.beforeMasterSubQueries(ctxGen);
                }

                const parentFieldName = x.name[x.name.length - 1];
                for (const p of parentRecords) {
                    const ctx: ResolverContext = {
                        ...ctxGen,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        parent: p,
                        resolverCapabilities: {
                            filtering: false,
                            sorting: false,
                            limit: false,
                            offset: false,
                        },
                    };

                    let recs = (await x.resolver(
                        resolvingFields,
                        hasAliasNameCond ? [] : condWhere,
                        1, 0, ctx)).slice(0, 1);

                    if (hasAliasNameCond) {
                        ctx.resolverCapabilities.filtering = false;
                        ctx.resolverCapabilities.limit = false;
                        ctx.resolverCapabilities.offset = false;
                        ctx.resolverCapabilities.sorting = false;
                    }

                    if (hasAliasNameCond) {
                        recs = mapSelectFields(ctxGen, x, recs, isAggregation);
                    }

                    if (! ctx.resolverCapabilities.filtering) {
                        recs = applyWhereConditions(ctxGen, condWhere, recs);
                    }

                    if (! hasAliasNameCond) {
                        recs = mapSelectFields(ctxGen, x, recs, isAggregation);
                    }

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    p[parentFieldName] = recs.length > 0 ? recs[0] : null;

                    records = records.concat(recs);
                }

                if (builder.events.afterMasterSubQueries) {
                    await builder.events.afterMasterSubQueries(ctxGen);
                }

                const parentRemovingFields = removingFieldsMap.get(parentKey); // TODO: Is it always no effects?
                if (parentRemovingFields) {
                    parentRemovingFields.delete(parentFieldName);
                }
            }

            const removingFields = getRemovingFields(x, records, isAggregation);
            removingFieldsAndRecords.push([removingFields, records]);
            removingFieldsMap.set(currentKey, removingFields);

            queriedRecords.set(currentKey, records);
            resolverNames.set(currentKey, resolverName);
        }

        if (query.selectSubQueries && primaryRecords) {
            const promises: Promise<{ name: string[], parent: any, result: any[] }>[] = [];
            for (const x of query.selectSubQueries) {
                const subQueryName = x.query.from[0].name;
                const parentKey = JSON.stringify(subQueryName.slice(0, subQueryName.length - 1));
                const parentRecords = queriedRecords.get(parentKey);

                if (parentRecords) {
                    // For N+1 Query problem // TODO: reduce descendants (grandchildren and ...) queries

                    const {
                        parentType,
                        resolverName,
                        parentResolverName,
                        foreignIdField,
                        parentIdFieldName,
                        currentIdFieldName,
                    } = getResolversInfo(builder, resolverNames, x.query.from[0], 0);

                    if (builder.events.beforeDetailSubQueries) {
                        await builder.events.beforeDetailSubQueries({
                            functions: builder.functions,
                            query: x.query,
                            graphPath: subQueryName,
                            resolverName,
                            parentResolverName,
                            parentType,
                            foreignIdField,
                            masterIdField: parentIdFieldName,
                            detailIdField: currentIdFieldName,
                            parentRecords,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            resolverData,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            transactionData: tr,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            transactionOptions: trOptions,
                        });
                    }

                    for (const p of parentRecords) {
                        promises.push(
                            executeCompiledQuery(
                                builder, tr, trOptions,
                                x.query, p, queriedRecords, resolverNames, resolverData)
                            .then(q => ({
                                name: subQueryName,
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                parent: p,
                                result: q,
                            }))
                        );
                    }

                    if (builder.events.afterDetailSubQueries) {
                        await builder.events.afterDetailSubQueries({
                            functions: builder.functions,
                            query: x.query,
                            graphPath: subQueryName,
                            parentRecords,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            resolverData,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            transactionData: tr,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            transactionOptions: trOptions,
                        });
                    }
                }

                const parentRemovingFields = removingFieldsMap.get(parentKey); // TODO: Is it always no effects?
                if (parentRemovingFields) {
                    parentRemovingFields.delete(subQueryName[subQueryName.length - 1]);
                }
            }

            const results = await Promise.all(promises);
            results.forEach(r => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                r.parent[r.name[r.name.length - 1]] = r.result;
            });
        }

        if (primaryRecords) {
            if (primaryCapabilities) {
                if (! primaryCapabilities.sorting) {
                    primaryRecords = sortRecords(query, primaryRecords);
                }

                if (! (primaryCapabilities.offset || primaryCapabilities.limit)) {
                    if (typeof query.offset === 'number' && typeof query.limit === 'number') {
                        primaryRecords = primaryRecords.slice(query.offset, query.offset + query.limit);
                    } else if (typeof query.offset === 'number') {
                        primaryRecords = primaryRecords.slice(query.offset);
                    } else if (typeof query.limit === 'number') {
                        primaryRecords = primaryRecords.slice(0, query.limit);
                    }
                } else if (! primaryCapabilities.offset) {
                    if (typeof query.offset === 'number') {
                        primaryRecords = primaryRecords.slice(query.offset);
                    }
                } else if (! primaryCapabilities.limit) {
                    if (typeof query.limit === 'number') {
                        primaryRecords = primaryRecords.slice(0, query.limit);
                    }
                }
            }
        } else {
            // NOTE: never reach here.
            primaryRecords = [];
        }

        for (const ent of removingFieldsAndRecords) {
            const [removingFields, records] = ent;
            for (const r of records) {
                for (const name of removingFields) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    delete r[name];
                }
            }
        }

        if (!parent && builder.events.endExecute) {
            await builder.events.endExecute({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                resolverData,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                transactionData: tr,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                transactionOptions: trOptions,
            }, null);
        }
    } catch (e) {
        if (!parent && builder.events.endExecute) {
            await builder.events.endExecute({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                resolverData,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                transactionData: tr,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                transactionOptions: trOptions,
            }, e);
        }
        throw e;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return primaryRecords;
}
