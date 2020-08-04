// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { PreparedQuery,
         PreparedResolver,
         PreparedSubQuery,
         PreparedCondition,
         PreparedOrderByField,
         ResolverContext,
         QueryBuilderInfoInternal }    from '../types';
import { deepCloneObject,
         isEqualComplexName,
         getTrueCaseFieldName,
         getObjectValueWithFieldNameMap,
         getTrueCasePathName,
         getObjectTrueCasePathValue,
         getObjectPathValue }          from './util';
import { callAggregateFunction,
         callScalarFunction,
         callImmediateScalarFunction } from './call';
import { applyWhereConditions,
         applyHavingConditions }       from '../filters';



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
                                }
                            }
                            break;
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
        builder: QueryBuilderInfoInternal, condTemplate: PreparedCondition[],
        resolverData: any | null) {

    const condSubQueries: Array<{ cond: PreparedCondition, index: number, subQuery: PreparedSubQuery }> = [];

    condTemplate.forEach(x => collectSubQueriesFromCondition(condSubQueries, x));

    const condSubQueryResults =
        condSubQueries
            .map(x =>
                executeQuery(builder, x.subQuery.query, null, null, null, resolverData)
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
        x: PreparedResolver, records: any[]) {

    for (const record of records) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const ent of x.queryFieldsMap!.entries()) {
            const [fieldName, field] = ent;

            switch (field.type) {
            case 'field':
                if (field.aliasName) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    record[field.aliasName] = record[fieldName];
                }
                break;
            case 'fncall':
                {
                    const fnNameI = field.fn.toLowerCase();
                    const fnInfo = ctx.functions.find(x => x.name.toLowerCase() === fnNameI);
                    switch (fnInfo?.type) {
                    case 'scalar':
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                        record[field.aliasName!] = callScalarFunction(ctx, field, fnInfo, 'any', record);
                        break;
                    case 'immediate-scalar':
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                        record[field.aliasName!] = callImmediateScalarFunction(ctx, field, fnInfo, 'any');
                        break;
                    default:
                        // Nothing to do.
                        break;
                    }
                }
                break;
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
                    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                    v = '__$$GENSYM_VT4iHbNbZW3C7taC7J6bx8pruw40cX5X$$_' + i++;
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
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        x: PreparedResolver, records: any[][]) {

    const result: any[] = [];

    for (const g of records) {
        const agg = {};
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const ent of x.queryFieldsMap!.entries()) {
            const [, field] = ent;

            switch (field.type) {
            case 'field':
                throw new Error(`${field.name.join('.')} is not allowed. Aggregate function is needed.`);
            case 'fncall':
                {
                    const fnNameI = field.fn.toLowerCase();
                    const fnInfo = ctx.functions.find(x => x.name.toLowerCase() === fnNameI);

                    switch (fnInfo?.type) {
                    case 'aggregate':
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-assignment
                        agg[field.aliasName!] = callAggregateFunction(ctx, field, fnInfo, 'any', g);
                        break;
                    case 'immediate-scalar':
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-assignment
                        agg[field.aliasName!] = callImmediateScalarFunction(ctx, field, fnInfo, 'any');
                        break;
                    default:
                        throw new Error(`${field.aliasName ?? '(unnamed)'} is not allowed. Aggregate function is needed.`);
                    }
                }
                break;
            }
        }
        result.push(agg);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
}


function sortRecords(query: PreparedQuery, records: any[]) {
    if (query.orderBy) {
        const primaryPathLen = query.from[0].name.length;
        const orderFields = query.orderBy;

        records = records.sort((a, b) => {
            const direction =
                (f: PreparedOrderByField, r: number) =>
                    f.direction === 'desc' ? -r : r;

            const fieldAndFNames = orderFields.map(f => ({
                f,
                fName: getTrueCasePathName(records[0], f.name.slice(primaryPathLen)),
            }));

            // eslint-disable-next-line prefer-const
            LOOP: for (let {f, fName} of fieldAndFNames) {
                let va = null;
                let vb = null;

                if (fName !== null) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    va = getObjectTrueCasePathValue(a, fName);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    vb = getObjectTrueCasePathValue(b, fName);
                } else {
                    // Fallback (when the child relationship of records[0] is null)

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    va = getObjectPathValue(a, f.name.slice(primaryPathLen));

                    fName = getTrueCasePathName(b, f.name.slice(primaryPathLen));
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    vb = fName !== null ? getObjectTrueCasePathValue(b, fName) : null;
                }

                if (va === vb) {
                    continue;
                }
                if (va === null) {
                    return direction(f, f.nulls === 'first' ? 1 : -1);
                }
                if (vb === null) {
                    return direction(f, f.nulls === 'first' ? -1 : 1);
                }

                switch (typeof va) {
                case 'number': case 'bigint':
                    return direction(f, (va as any) - (vb as any));
                case 'string':
                    // TODO: date and datetime
                    return direction(f, va > vb ? 1 : -1);
                default:
                    // Ignore this field
                    continue LOOP;
                }
            }
            return 0;
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return records;
}


function getRemovingFields(x: PreparedResolver, records: any[]) {
    const removingFields = new Set<string>();
    if (records.length) {
        const requestedFields = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const rec = records[0];
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const ent of x.queryFieldsMap!.entries()) {
            const name = getTrueCaseFieldName(rec, ent[0]);
            if (name) {
                requestedFields.add(name);
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


export async function executeQuery(
        builder: QueryBuilderInfoInternal,
        query: PreparedQuery,
        parent: any | null,
        parentQueriedRecords: Map<string, any[]> | null,
        parentResolverNames: Map<string, string> | null,
        parentResolverData: any | null
        ): Promise<any[]> {

    let primaryRecords: any[] | undefined;
    const queriedRecords = parentQueriedRecords ?? new Map<string, any[]>();
    const resolverNames = parentResolverNames ?? new Map<string, string>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const resolverData = parentResolverData ?? {};

    if (!parent && builder.events.beginExecute) {
        await builder.events.beginExecute({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            resolverData,
        });
    }

    try {
        const condWhereTemplate = query.where ?
            deepCloneObject(query.where) : [];
        const condHavingTemplate = query.having ?
            deepCloneObject(query.having) : [];

        await execCondSubQueries(builder, condWhereTemplate, resolverData);
        await execCondSubQueries(builder, condHavingTemplate, resolverData);

        const removingFieldsAndRecords: Array<[Set<string>, any[]]> = [];
        const removingFieldsMap = new Map<string, Set<string>>();

        for (let i = 0; i < query.from.length; i++) {
            const x = query.from[i];

            const parentType = i === 0 ? 'master' : 'detail';
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
                    ? builder.rules.foreignIdFieldName!(parentResolverName!)
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    : builder.rules.foreignIdFieldName!(resolverName!) ;

            if (! x.resolver) {
                throw new Error(`Resolver name ${x.name.join('.')} is not resolved.`);
            }

            let records: any[] = [];
            const parentRecords = queriedRecords.get(parentKey);

            const queryFields =
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                Array.from(x.queryFields!.values());
            const condFields =
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                Array.from(x.condFields!.values());
            const groupFields: string[] =
                (i === 0 && query.groupBy) ? query.groupBy : [];
            const sortFields =
                query.orderBy
                    ? query.orderBy
                        .filter(c =>
                            x.name.length + 1 === c.name.length &&
                                isEqualComplexName(x.name, c.name.slice(0, x.name.length)))
                        .map(c => c.name[c.name.length - 1])
                    : [];

            const relationshipIdFields: string[] = [];
            for (let j = i + 1; j < query.from.length; j++) {
                const c = query.from[j];

                if (x.name.length + 1 === c.name.length && isEqualComplexName(x.name, c.name.slice(0, x.name.length))) {
                    const childResolverName = c.resolverName ?? '';
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion
                    const childRelationshipInfo = ((builder.relationships[resolverName] ?? {})[childResolverName] as any) ?? {};

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const childIdField = childRelationshipInfo.id
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        ? childRelationshipInfo.id as string
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        : builder.rules.foreignIdFieldName!(childResolverName);

                    if (childIdField) {
                        relationshipIdFields.push(childIdField);
                    }
                }
            }

            const resolvingFields =
                Array.from(
                    new Set<string>(queryFields
                        .concat(condFields)
                        .concat(builder.rules.idFieldName ? [builder.rules.idFieldName(resolverName)] : [])
                        .concat(groupFields)
                        .concat(sortFields)
                        .concat(relationshipIdFields)
                    ).values());

            let condWhere = deepCloneObject(condWhereTemplate);
            let condHaving = deepCloneObject(condHavingTemplate);

            condWhere = condWhere
                .map(cond => pruneCondition(x.name, cond))
                .filter(filterZeroLengthCondFn);
            condHaving = condHaving
                .map(cond => pruneCondition(x.name, cond))
                .filter(filterZeroLengthCondFn);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const parentIdFieldName = parentResolverName ? builder.rules.idFieldName!(parentResolverName) : void 0;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const currentIdFieldName = builder.rules.idFieldName!(resolverName);

            const ctxGen: Omit<ResolverContext, 'resolverCapabilities'> = {
                functions: builder.functions,
                graphPath: x.name,
                resolverName,
                parentResolverName,
                parentType,
                foreignIdField,
                masterIdField: i === 0 ? parentIdFieldName : currentIdFieldName,
                detailIdField: i === 0 ? currentIdFieldName : parentIdFieldName,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                resolverData,
            };

            if (i === 0) {
                const ctx: ResolverContext = {
                    ...ctxGen,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    parent,
                    resolverCapabilities: {
                        filtering: false,
                    },
                };
                records = await x.resolver(
                    resolvingFields, condWhere,
                    query.limit ?? null,
                    query.offset ?? null,
                    ctx,
                );

                if (! ctx.resolverCapabilities.filtering) {
                    records = applyWhereConditions(ctxGen, condWhere, records);
                }

                records = mapSelectFields(ctxGen, x, records);

                if (i === 0 && query.groupBy) {
                    let grouped = groupRecords(ctxGen, query.groupBy ?? [], x, records);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    grouped = applyHavingConditions(ctxGen, condHaving, grouped);
                    records = aggregateFields(ctxGen, x, grouped);
                }

                if (query.limit && records.length > query.limit) {
                    records = records.slice(0, query.limit);
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
                        },
                    };
                    let recs = (await x.resolver(resolvingFields, condWhere, 1, 0, ctx)).slice(0, 1);

                    if (! ctx.resolverCapabilities.filtering) {
                        recs = applyWhereConditions(ctxGen, condWhere, recs);
                    }

                    recs = mapSelectFields(ctxGen, x, recs);

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

            const removingFields = getRemovingFields(x, records);
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
                    if (builder.events.beforeDetailSubQueries) {
                        await builder.events.beforeDetailSubQueries({
                            graphPath: subQueryName,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            resolverData,
                        });
                    }

                    for (const p of parentRecords) {
                        promises.push(
                            executeQuery(builder, x.query, p, queriedRecords, resolverNames, resolverData)
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
                            graphPath: subQueryName,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            resolverData,
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
            primaryRecords = sortRecords(query, primaryRecords);
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
            }, null);
        }
    } catch (e) {
        if (!parent && builder.events.endExecute) {
            await builder.events.endExecute({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                resolverData,
            }, e);
        }
        throw e;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return primaryRecords as any[];
}
