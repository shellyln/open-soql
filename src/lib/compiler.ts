// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { ParsedQuery,
         PreparedQuery,
         PreparedField,
         PreparedFnCall,
         PreparedFieldListItem,
         ParsedResolver,
         PreparedCondition,
         PreparedOrderByField,
         ResolverTreeDirection,
         ResolverTreeNode,
         QueryBuilderInfoInternal } from '../types';
import { isEqualComplexName,
         getFullQualifiedName,
         getTrueCaseFieldName }     from './util';
import { flatConditions }           from './condition';



function makeResolverTree(
        builder: QueryBuilderInfoInternal,
        path: ResolverTreeNode[],
        args: Pick<ResolverTreeNode, 'fieldOrRelName' | 'resolverName' | 'direction'>): ResolverTreeNode {

    const argResolverNameI = args.resolverName.toLowerCase();
    const argfieldOrRelNameI = args.fieldOrRelName.toLowerCase();
    const trueCaseArgResolverName = getTrueCaseFieldName(builder.relationships, args.resolverName);

    if (! trueCaseArgResolverName) {
        throw new Error(`Resolver '${args.resolverName}' is not found.`);
    }

    const found = path.find(
        x => x.resolverName.toLowerCase() === argResolverNameI &&
        x.fieldOrRelName.toLowerCase() === argfieldOrRelNameI);

    if (found) {
        return found;
    }

    const children: ResolverTreeNode[] = [];
    const ret: ResolverTreeNode = {
        fieldOrRelName: args.fieldOrRelName,
        resolverName: trueCaseArgResolverName,
        // fkeyIdName: '', // TODO:
        direction: args.direction,
        children: children,
    };

    const q = builder.relationships[trueCaseArgResolverName];
    const nextPath = path.concat([ret]);

    for (const k of Object.keys(q)) {
        const c = q[k];
        if (Array.isArray(c)) {
            children.push(makeResolverTree(builder, nextPath, {
                resolverName: c[0],
                fieldOrRelName: k,
                direction: ResolverTreeDirection.MasterToDetail,
            }));
        } else if (typeof c === 'string') {
            children.push(makeResolverTree(builder, nextPath, {
                resolverName: c,
                fieldOrRelName: k,
                direction: ResolverTreeDirection.DetailsToMaster,
            }));
        } else {
            children.push(makeResolverTree(builder, nextPath, {
                resolverName: c.resolver,
                fieldOrRelName: k,
                direction: ResolverTreeDirection.DetailsToMaster,
            }));
        }
    }

    return ret;
}


function findResolver(
    query: ParsedQuery,
    x: PreparedField | PreparedOrderByField) {

    const rn = x.name.slice(0, x.name.length - 1);
    return query.from.find(w => isEqualComplexName(w.name, rn));
}


function registerFields(
        query: ParsedQuery,
        x: PreparedField | PreparedOrderByField,
        defaultResolver: ParsedResolver | undefined,
        fn: (rslv: ParsedResolver) => Set<string>) {

    const resolver = findResolver(query, x) ?? defaultResolver;
    if (resolver) {
        fn(resolver).add(x.name[x.name.length - 1]);
    }
}


function recureseForEachConditionFieldsFncall(
        x: PreparedFnCall,
        fn: (field: PreparedField | PreparedOrderByField) => void) {

    for (const arg of x.args) {
        switch (typeof arg) {
        case 'object':
            if (arg === null) {
                // NOTE: Nothing to do.
            } else {
                switch (arg.type) {
                case 'field':
                    fn(arg);
                    break;
                case 'fncall':
                    recureseForEachConditionFieldsFncall(arg, fn);
                    break;
                }
            }
            break;
        }
    }
}


function recureseForEachConditionFields(
        cond: PreparedCondition,
        fn: (field: PreparedField | PreparedOrderByField) => void) {

    switch (cond.type) {
    case 'condition':
        for (const x of cond.operands) {
            switch (typeof x) {
            case 'object':
                if (x === null) {
                    // NOTE: never reach here.
                } else if (Array.isArray(x)) {
                    // NOTE: Nothing to do. It is data.
                } else {
                    switch (x.type) {
                    case 'condition':
                        recureseForEachConditionFields(x, fn);
                        break;
                    case 'field':
                        fn(x);
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
                                        fn(arg);
                                        break;
                                    case 'fncall':
                                        recureseForEachConditionFieldsFncall(arg, fn);
                                        break;
                                    }
                                }
                                break;
                            }
                        }
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


function normalize(
        builder: QueryBuilderInfoInternal, query: ParsedQuery,
        parentName: string[], parentAliases: Map<string, string[]> | null): PreparedQuery {

    // Check and normalize `from` resolvers
    const resolverAliases = new Map<string, string[]>(parentAliases ?? []);

    if (parentName.length === 0 && query.from[0].name.length > 1) {
        throw new Error('Relationship name is not allowed at first item of root level from clause.');
    }

    {
        const x = query.from[0];
        if (query.from[0].name.length > 1) {
            while (resolverAliases.has(x.name[0].toLowerCase())) { // TODO: set max loop
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                x.name = resolverAliases.get(x.name[0].toLowerCase())!.concat(x.name.slice(1));
            }
        }
        if (parentName.length > 0) {
            x.name = getFullQualifiedName(parentName, x.name);
            if (! isEqualComplexName(x.name.slice(0, parentName.length), parentName)) {
                throw new Error(`Resolver name ${x.name.join('.')} is not match to parent resolver ${parentName.join('.')}`);
            }
        }
    }

    const primaryResolverName = query.from[0].name;

    if (query.from[0].aliasName) {
        resolverAliases.set(query.from[0].aliasName.toLowerCase(), primaryResolverName);
    }

    query.whereSubQueries = [];
    query.havingSubQueries = [];
    query.selectSubQueries = [];

    for (const x of query.from.slice(1)) {
        if (x.name.length === 1) {
            x.name = primaryResolverName.concat(x.name);
        } else {
            let nameI = x.name[0].toLowerCase();
            while (resolverAliases.has(nameI)) { // TODO: set max loop
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                x.name = resolverAliases.get(nameI)!.concat(x.name.slice(1));
                nameI = x.name[0].toLowerCase();
            }

            x.name = getFullQualifiedName(primaryResolverName, x.name);
        }
        if (x.aliasName) {
            resolverAliases.set(x.aliasName.toLowerCase(), x.name);
        }
    }

    const fieldAliasNames = new Map<string, string[]>();
    let normalizeTarget: 'select' | 'where' | 'having' | 'orderby' = 'select';

    const normalizeSelectField = (x: PreparedField | PreparedOrderByField) => {
        // Resolve field alias names
        switch (normalizeTarget) {
        case 'select':
            if ((x as PreparedField).aliasName) {
                fieldAliasNames.set(
                    ((x as PreparedField).aliasName as string).toLowerCase(),
                    x.name
                );
            }
            break;
        case 'where': case 'having': case 'orderby':
            if (x.name.length === 1) {
                const nameI = x.name[0].toLowerCase();
                if (fieldAliasNames.has(nameI)) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    x.name = fieldAliasNames.get(nameI)!;
                }
            }
            break;
        }

        // Resolve resolver alias names
        if (x.name.length === 1) {
            x.name = primaryResolverName.concat(x.name);
        } else {
            let nameI = x.name[0].toLowerCase();
            while (resolverAliases.has(nameI)) { // TODO: set max loop
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                x.name = resolverAliases.get(nameI)!.concat(x.name.slice(1));
                nameI = x.name[0].toLowerCase();
            }

            x.name = getFullQualifiedName(primaryResolverName, x.name);

            const rn = x.name.slice(0, x.name.length - 1);
            if (! query.from.find(w => isEqualComplexName(w.name, rn))) {
                query.from.push({
                    name: rn,
                    aliasName: null,
                });
            }
        }

        return x;
    };

    const normalizeFnCall = (x: PreparedFnCall, opIndex: number) => {
        const fnNameI = x.fn.toLowerCase();
        const found = builder.functions.find(z => z.name.toLowerCase() === fnNameI);
        if (! found) {
            throw new Error(`Function '${x.fn}' is not found.`);
        }

        switch (normalizeTarget) {
        case 'select':
            if (found.type === 'aggregate' && !query.groupBy) {
                query.groupBy = [];
            }
            break;
        case 'where':
            if (found.type === 'aggregate') {
                // NOTE: scalar and immediate-scalar is allowed.
                throw new Error(`Aggregate function '${x.fn}' is not allowed.`);
            }
            if (opIndex !== 0 && found.type !== 'immediate-scalar') {
                throw new Error(`Function '${x.fn}' is not allowed at operand ${opIndex + 1}.`);
            }
            break;
        case 'having':
            if (opIndex !== 0 && found.type !== 'immediate-scalar') {
                throw new Error(`Function '${x.fn}' is not allowed at operand ${opIndex + 1}.`);
            }
            break;
        }

        for (const arg of x.args) {
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    // NOTE: Nothing to do.
                } else {
                    switch (arg.type) {
                    case 'field':
                        normalizeSelectField(arg);
                        break;
                    case 'fncall':
                        normalizeFnCall(arg, 0); // NOTE: treat as opIndex = 0 (always correct)
                        break;
                    }
                }
                break;
            }
        }

        return x;
    };

    const normalizeCondition = (cond: PreparedCondition) => {
        switch (cond.type) {
        case 'condition':
            for (let i = 0; i < cond.operands.length; i++) {
                const x = cond.operands[i];
                switch (typeof x) {
                case 'object':
                    if (x === null) {
                        // NOTE: never reach here.
                    } else if (Array.isArray(x)) {
                        // NOTE: Nothing to do. It is data.
                    } else {
                        switch (x.type) {
                        case 'condition':
                            normalizeCondition(x);
                            break;
                        case 'field':
                            normalizeSelectField(x);
                            break;
                        case 'fncall':
                            normalizeFnCall(x, i);
                            break;
                        case 'subquery':
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            (normalizeTarget === 'where' ?
                                query.whereSubQueries :
                                query.havingSubQueries)!.push(x);
                            x.query = normalize(builder, x.query, [], null);
                            break;
                        }
                    }
                    break;
                }
            }
            break;
        }
        return cond;
    };

    // Check and normalize `select` fields
    for (let i = 0; i < query.select.length; i++) {
        const x = query.select[i];
        switch (x.type) {
        case 'field':
            normalizeSelectField(x);
            break;
        case 'fncall':
            normalizeFnCall(x, i);
            break;
        case 'subquery':
            query.selectSubQueries.push(x);
            x.query = normalize(builder, x.query, primaryResolverName, resolverAliases);
            break;
        }
    }

    // Check and normalize `where` fields
    if (query.where) {
        normalizeTarget = 'where';
        normalizeCondition(query.where[0]);
    }

    // Check and normalize `having` fields
    if (query.having) {
        normalizeTarget = 'having';
        normalizeCondition(query.having[0]);
    }

    // Check and normalize `orderBy` fields
    if (query.orderBy) {
        normalizeTarget = 'orderby';
        for (const x of query.orderBy) {
            normalizeSelectField(x);
        }
    }

    for (const x of query.from) {
        x.queryFields = new Set<string>();
        x.queryFieldsMap = new Map<string, PreparedFieldListItem>();
        x.condFields = new Set<string>();
        x.condAliasFields = new Set<string>();
        x.havingCondFields = new Set<string>();
        // fieldAliasNames
        // sortFieldNames
        x.relationshipIdFields = new Set<string>();
    }

    const registerQueryFields = (x: PreparedField) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        registerFields(query, x, query.from[0], (rslv: ParsedResolver) => rslv.queryFields!);

    const registerCondFields = (x: PreparedField | PreparedOrderByField) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        registerFields(query, x, query.from[0], (rslv: ParsedResolver) => rslv.condFields!);

    const registerHavingCondFields = (x: PreparedField | PreparedOrderByField) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        registerFields(query, x, query.from[0], (rslv: ParsedResolver) => rslv.havingCondFields!);

    let exprCount = 0;

    const collectFncallQueryFields = (x: PreparedFnCall, nested: boolean) => {
        if (! nested) {
            if (! x.aliasName) {
                x.aliasName = `expr${exprCount++}`; // TODO: Check conflict
            }
        }
        let resolver: ParsedResolver | undefined = void 0;
        for (const arg of x.args) {
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    // NOTE: Nothing to do.
                } else {
                    switch (arg.type) {
                    case 'field':
                        registerQueryFields(arg);
                        if (! resolver) {
                            // BUG: TODO: Check all arguments are same resolver's field.
                            resolver = findResolver(query, arg);
                        }
                        break;
                    case 'fncall':
                        {
                            const resolverTmp = collectFncallQueryFields(arg, true);
                            if (! resolver) {
                                resolver = resolverTmp;
                            }
                        }
                        break;
                    }
                }
                break;
            }
        }
        if (! nested) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            (resolver ?? query.from[0]).queryFieldsMap!.set(x.aliasName, x);
        }
        return resolver;
    };

    for (const x of query.select) {
        switch (x.type) {
        case 'field':
            {
                registerQueryFields(x);
                const resolver = findResolver(query, x); // TODO: find twice!
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                resolver?.queryFieldsMap!.set(x.name[x.name.length - 1], x);
            }
            break;
        case 'fncall':
            collectFncallQueryFields(x, false);
            break;
        }
    }

    if (query.where) {
        recureseForEachConditionFields(query.where[0], registerCondFields);
    }

    if (query.having) {
        recureseForEachConditionFields(query.having[0], registerHavingCondFields);
    }

    if (query.groupBy) {
        for (const x of query.groupBy) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            query.from[0].havingCondFields!.add(x);
        }
    }

    query.from[0].name = primaryResolverName;

    // Check resolvers' paths
    const primaryResolverRootTrueCaseName = getTrueCaseFieldName(builder.relationships, primaryResolverName[0]);
    if (! primaryResolverRootTrueCaseName) {
        throw new Error(`Resolver '${primaryResolverName[0]}' is not found.`);
    }

    const resolverTree = makeResolverTree(builder, [], {
        resolverName: primaryResolverRootTrueCaseName,
        fieldOrRelName: primaryResolverRootTrueCaseName,
        direction: ResolverTreeDirection.DetailsToMaster,
    });

    for (const x of query.from) {
        let rt = [resolverTree];
        let lastFound: ResolverTreeNode | undefined;

        for (let j = 0; j < x.name.length; j++) {
            const name = x.name[j];
            const nameI = name.toLowerCase();
            const found = rt.find(z => z.fieldOrRelName.toLowerCase() === nameI);
            if (found) {
                lastFound = found;
                rt = found.children;
                x.name[j] = found.fieldOrRelName; // NOTE: fix case
            } else {
                throw new Error(`Resolver '${name}' is not found.`);
            }
        }

        if (lastFound) {
            x.resolver = builder.resolvers.query[lastFound.resolverName];
            x.resolverName = lastFound.resolverName;
        }
    }

    if (query.where) {
        const c: PreparedCondition[] = [];
        flatConditions(c, 'and', query.where[0]);
        query.where = c;
    }
    if (query.having) {
        const c: PreparedCondition[] = [];
        flatConditions(c, 'and', query.having[0]);
        query.having = c;
    }

    // TODO: Error if subquery appears `or`'s 2nd or later operand.

    query.from = query.from.slice(0, 1).concat(
        query.from.slice(1).sort((a, b) => a.name.length - b.name.length));

    for (let i = 0; i < query.from.length; i++) {
        const x = query.from[i];

        {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            x.fieldAliasNames = new Set<string>(Array.from(x.queryFieldsMap!.entries()).map(c => {
                const f = c[1];
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                if (f.aliasName && !x.queryFields!.has(f.aliasName)) {
                    return f.aliasName.toLowerCase();
                } else {
                    return '';
                }
            }).filter(c => !!c));

            for (const c of x.fieldAliasNames) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                if (x.condFields!.has(c)) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    x.condFields!.delete(c);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    x.condAliasFields!.add(c);
                }
            }
        }

        {
            x.sortFieldNames = new Set<string>(
                query.orderBy
                    ? query.orderBy
                        .filter(c =>
                            x.name.length + 1 === c.name.length &&
                                isEqualComplexName(x.name, c.name.slice(0, x.name.length)))
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        .filter(c => !(x.fieldAliasNames!.has(c.name[c.name.length - 1].toLowerCase())))
                        .map(c => c.name[c.name.length - 1])
                    : []);
        }

        {
            const resolverName = x.resolverName ?? '';

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
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        x.relationshipIdFields!.add(childIdField);
                    }
                }
            }
        }
    }

    return query as PreparedQuery;
}


export function compile(
    builder: QueryBuilderInfoInternal, query: ParsedQuery): PreparedQuery {

    return normalize(builder, query, [], null);
}
