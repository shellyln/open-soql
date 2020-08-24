// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { ResolverContext,
         FieldResultType,
         PreparedConditionOperand,
         PreparedCondition,
         PreparedAtomValue,
         PreparedField,
         PreparedFnCall,
         ScalarQueryFuncInfo,
         ImmediateScalarQueryFuncInfo,
         AggregateQueryFuncInfo }         from './types';
import { getTrueCaseFieldName,
         getObjectValueWithFieldNameMap } from './lib/util';
import { callAggregateFunction,
         callScalarFunction,
         callImmediateScalarFunction,
         isScalarFnCallable }             from './lib/call';
import { CondOp1CacheValue,
         condOp1FnCache,
         condOp2ValueCache }              from './lib/cache';



const getOp1Noop = (
    fieldNameMap: Map<string, string>, ctx: Omit<ResolverContext, 'resolverCapabilities'>,
    cache: CondOp1CacheValue, record: any) => void 0;


const getOp1AggregateFnValue = (
        fieldNameMap: Map<string, string>, ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        cache: CondOp1CacheValue, record: any) => {

    const { op, op2FieldResultType, fnInfo } = cache;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return callAggregateFunction(
        ctx, op as PreparedFnCall, fnInfo as AggregateQueryFuncInfo, op2FieldResultType,
        record);
}


const getOp1ScalarOnAggFnValue = (
        fieldNameMap: Map<string, string>, ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        cache: CondOp1CacheValue, record: any) => {

    const { op, op2FieldResultType, fnInfo } = cache;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const firstRec = record[0];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment
    return callScalarFunction(
        ctx, op as PreparedFnCall, fnInfo as ScalarQueryFuncInfo, op2FieldResultType,
        firstRec, record);
}


const getOp1ScalarOnNonAggFnValue = (
        fieldNameMap: Map<string, string>, ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        cache: CondOp1CacheValue, record: any) => {

    const { op, op2FieldResultType, fnInfo } = cache;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment
    return callScalarFunction(
        ctx, op as PreparedFnCall, fnInfo as ScalarQueryFuncInfo, op2FieldResultType,
        record, null);
}


const getOp1ImmediateScalarOnAggFnValue = (
        fieldNameMap: Map<string, string>, ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        cache: CondOp1CacheValue, record: any) => {

    const { op, op2FieldResultType, fnInfo } = cache;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment
    return callImmediateScalarFunction(
        ctx, op as PreparedFnCall, fnInfo as ImmediateScalarQueryFuncInfo, op2FieldResultType,
        null, record);
}


const getOp1ImmediateScalarOnNonAggFnValue = (
        fieldNameMap: Map<string, string>, ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        cache: CondOp1CacheValue, record: any) => {

    const { op, op2FieldResultType, fnInfo } = cache;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment
    return callImmediateScalarFunction(
        ctx, op as PreparedFnCall, fnInfo as ImmediateScalarQueryFuncInfo, op2FieldResultType,
        record,  null);
}


function createOp1Cache(
    groupFields: Map<string, string> | null,
    isAggregation: boolean,
    ctx: Omit<ResolverContext, 'resolverCapabilities'>,
    cond: PreparedCondition) {

    let cache: CondOp1CacheValue | undefined = condOp1FnCache.get(cond);
    const op = cond.operands[0];
    const op2 = cond.operands[1];
    let op2IsDateOrDatetime = false;
    let op2FieldResultType: FieldResultType = 'any';

    switch (typeof op2) {
    case 'object':
        if (op2 === null) {
            // nothing to do
        } else if (Array.isArray(op2)) {
            // nothing to do
        } else {
            switch (op2.type) {
            case 'date': case 'datetime':
                op2IsDateOrDatetime = true;
                op2FieldResultType = op2.type;
                break;
            }
        }
    }

    switch (typeof op) {
    case 'object':
        if (op === null) {
            // nothing to do (v is null)
        } else if (Array.isArray(op)) {
            throw new Error(`Array is not allowed in the operand(1).`);
        } else {
            switch (op.type) {
            case 'field':
                cache = {
                    isField: true,
                    isDateOrDatetime: op2IsDateOrDatetime,
                    op,
                    op2FieldResultType,
                    fnInfo: null,
                    fn: getOp1Noop,
                };
                condOp1FnCache.set(cond, cache);
                break;
            case 'fncall':
                {
                    const fnNameI = op.fn.toLowerCase();
                    const fnInfo = ctx.functions.find(x => x.name.toLowerCase() === fnNameI);

                    switch (fnInfo?.type) {
                    case 'aggregate':
                        if (! isAggregation) {
                            throw new Error(`Aggregate function ${fnInfo.name} is not allowed.`);
                        }
                        cache = {
                            isField: false,
                            isDateOrDatetime: false,
                            op,
                            op2FieldResultType,
                            fnInfo,
                            fn: getOp1AggregateFnValue,
                        };
                        condOp1FnCache.set(cond, cache);
                        break;
                    case 'scalar':
                        if (isAggregation) {
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            if (! isScalarFnCallable(ctx, groupFields!, op.args)) {
                                throw new Error(`${op.fn} is not allowed. Aggregate function is needed.`);
                            }
                            cache = {
                                isField: false,
                                isDateOrDatetime: false,
                                op,
                                op2FieldResultType,
                                fnInfo,
                                fn: getOp1ScalarOnAggFnValue,
                            };
                            condOp1FnCache.set(cond, cache);
                        } else {
                            cache = {
                                isField: false,
                                isDateOrDatetime: false,
                                op,
                                op2FieldResultType,
                                fnInfo,
                                fn: getOp1ScalarOnNonAggFnValue,
                            };
                            condOp1FnCache.set(cond, cache);
                        }
                        break;
                    case 'immediate-scalar':
                        cache = {
                            isField: false,
                            isDateOrDatetime: false,
                            op,
                            op2FieldResultType,
                            fnInfo,
                            fn: isAggregation
                                ? getOp1ImmediateScalarOnAggFnValue
                                : getOp1ImmediateScalarOnNonAggFnValue,
                        };
                        condOp1FnCache.set(cond, cache);
                        break;
                    default:
                        throw new Error(`Unexpected type appears in the operand(1).`);
                    }
                }
                break;
            default:
                throw new Error(`Unexpected type appears in the operand(1).`);
            }
        }
        break;
    default:
        throw new Error(`Unexpected type appears in the operand(1).`);
    }

    return cache as CondOp1CacheValue;
}


function getOp1Value(
        fieldNameMap: Map<string, string>,
        groupFields: Map<string, string> | null,
        isAggregation: boolean,
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        cond: PreparedCondition, record: any) {

    let v = null;
    const op = cond.operands[0];

    const cache: CondOp1CacheValue = condOp1FnCache.get(cond)
        ?? createOp1Cache(groupFields, isAggregation, ctx, cond);
    
    if (op === null) {
        // NOTE: `cache` is possibly undefined.
        // nothing to do (v is null)
    } else if (Array.isArray(op)) {
        throw new Error(`Array is not allowed in the operand(1).`);
    } else if (cache.isField) {
        // NOTE: Inline expansion

        const { isDateOrDatetime, op } = cache;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        v = getObjectValueWithFieldNameMap(
            fieldNameMap, record, (op as PreparedField).name[(op as PreparedField).name.length - 1]);

        if (isDateOrDatetime && v !== null) {
            v = new Date(v).getTime();
        }
    } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        v = cache.fn(fieldNameMap, ctx, cache, record);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return v;
}


function getOp2Value(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        cond: PreparedCondition, record: any):
        string | number | PreparedAtomValue[] | null {

    const cached = condOp2ValueCache.get(cond);
    if (cached) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return cached.value;
    }

    let v = null;
    const op = cond.operands[1];

    switch (typeof op) {
    case 'object':
        if (op === null) {
            // nothing to do (v is null)
        } else if (Array.isArray(op)) {
            v = op;
        } else {
            switch (op.type) {
            case 'fncall':
                {
                    const fnNameI = op.fn.toLowerCase();
                    const fnInfo = ctx.functions.find(x => x.name.toLowerCase() === fnNameI);

                    switch (fnInfo?.type) {
                    case 'immediate-scalar':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        v = callImmediateScalarFunction(ctx, op, fnInfo, 'any', null, null);
                        break;
                    default:
                        throw new Error(`Unexpected type appears in the operand(2).`);
                    }
                }
            default:
                switch (op.type) {
                case 'date': case 'datetime':
                    v = new Date(op.value).getTime();
                    break;
                default:
                    throw new Error(`Unexpected type appears in the operand(2).`);
                }
                break;
            }
        }
        break;
    default:
        v = op; // string or number
        break;
    }

    condOp2ValueCache.set(cond, { value: v });
    return v;
}


function evalRecursiveCondition(
        fieldNameMap: Map<string, string>,
        groupFields: Map<string, string> | null,
        isAggregation: boolean,
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        w: PreparedConditionOperand, record: any): boolean {

    let ret = true;

    switch (typeof w) {
    case 'object':
        if (Array.isArray(w)) {
            throw new Error(`Array is not allowed in the condition.`);
        } else {
            if (w === null) {
                throw new Error(`Unexpected type appears in the condition.`);
            }
            switch (w.type) {
            case 'condition':
                ret = evalCondition(fieldNameMap, groupFields, isAggregation, ctx, w, record);
                break;
            default:
                throw new Error(`Unexpected type appears in the condition.`);
            }
        }
        break;
    default:
        throw new Error(`Unexpected type appears in the condition.`);
    }

    return ret;
}


function convertPattern(v: string) {
    // NOTE: wildcards are '%' (= /.*/) and '_' (= /./)
    //       wildcard escape sequences are '\%' and '\_'

    const pat0 = v.replace(/[.*+?^=!:${}()|[\]\/]/g, '\\$&');
    let pattern = '';
    let prev: string | undefined = void 0;

    for (const c of pat0) {
        switch (c) {
        case '%':
            if (prev === '\\') {
                pattern += '%';
            } else {
                pattern += '.*';
            }
            break;
        case '_':
            if (prev === '\\') {
                pattern += '_';
            } else {
                pattern += '.';
            }
            break;
        case '\\':
            break;
        default:
            if (prev === '\\') {
                pattern += '\\';
            }
            pattern += c;
        }
        prev = c;
    }
    if (prev === '\\') {
        pattern += '\\';
    }
    return `^${pattern}$`;
}


function evalCondition(
        fieldNameMap: Map<string, string>,
        groupFields: Map<string, string> | null,
        isAggregation: boolean,
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        cond: PreparedCondition, record: any): boolean {

    let ret = true;

    EVAL: switch (cond.op) {
    case 'true':
        break;
    case 'and':
        for (const w of cond.operands) {
            if (! evalRecursiveCondition(fieldNameMap, groupFields, isAggregation, ctx, w, record)) {
                ret = false;
                break EVAL;
            }
        }
        break;
    case 'or':
        for (const w of cond.operands) {
            if (evalRecursiveCondition(fieldNameMap, groupFields, isAggregation, ctx, w, record)) {
                break EVAL;
            }
        }
        ret = false;
        break;
    case 'not':
        ret = !evalRecursiveCondition(fieldNameMap, groupFields, isAggregation, ctx, cond.operands[0], record);
        break;
    default:
        {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const v1 = getOp1Value(fieldNameMap, groupFields, isAggregation, ctx, cond, record);
            const v2 = getOp2Value(ctx, cond, record);
            switch (cond.op) {
            case '=':
                if (! (v1 === v2)) {
                    ret = false;
                }
                break;
            case '!=':
                if (! (v1 !== v2)) {
                    ret = false;
                }
                break;
            case '<':
                if (v1 === null) {
                    ret = false;
                    break;
                }
                if (v2 === null) {
                    ret = false;
                    break;
                }
                if (! ((v1 as any) < (v2 as any))) {
                    ret = false;
                }
                break;
            case '<=':
                if (v1 === null) {
                    ret = false;
                    break;
                }
                if (v2 === null) {
                    ret = false;
                    break;
                }
                if (! ((v1 as any) <= (v2 as any))) {
                    ret = false;
                }
                break;
            case '>':
                if (v1 === null) {
                    ret = false;
                    break;
                }
                if (v2 === null) {
                    ret = false;
                    break;
                }
                if (! ((v1 as any) > (v2 as any))) {
                    ret = false;
                }
                break;
            case '>=':
                if (v1 === null) {
                    ret = false;
                    break;
                }
                if (v2 === null) {
                    ret = false;
                    break;
                }
                if (! ((v1 as any) >= (v2 as any))) {
                    ret = false;
                }
                break;
            case 'like':
                if (typeof v1 !== 'string') {
                    ret = false;
                    break;
                }
                if (typeof v2 !== 'string') {
                    throw new Error(`Operator "like": operand(2) should be string.`);
                }
                {
                    const re = new RegExp(convertPattern(v2), 'i');
                    if (! re.test(v1)) {
                        ret = false;
                    }
                }
                break;
            case 'not_like':
                if (typeof v1 !== 'string') {
                    ret = false;
                    break;
                }
                if (typeof v2 !== 'string') {
                    throw new Error(`Operator "not_like": operand(2) should be string.`);
                }
                {
                    const re = new RegExp(convertPattern(v2), 'i');
                    if (re.test(v1)) {
                        ret = false;
                    }
                }
                break;
            case 'in':
                if (! Array.isArray(v2)) {
                    throw new Error(`Operator "in": operand(2) should be array.`);
                }
                if (! v2.filter(w => w !== null).includes(v1)) {
                    // NOTE: `(null = ?)`, `(? = null)` and `(null = null)` always FALSE.
                    ret = false;
                }
                break;
            case 'not_in':
                if (! Array.isArray(v2)) {
                    throw new Error(`Operator "not_in": operand(2) should be array.`);
                }
                if (v1 === null) {
                    // NOTE: Emulate SQL's 'not in'; `(null <> null)` always FALSE.
                    ret = false;
                    break;
                }
                if (v2.includes(null)) {
                    ret = false;
                    break;
                }
                if (v2.includes(v1)) {
                    ret = false;
                }
                break;
            case 'includes':
                if (typeof v1 !== 'string') {
                    ret = false;
                    break;
                }
                if (! Array.isArray(v2)) {
                    throw new Error(`Operator "includes": operand(2) should be array.`);
                }
                ret = false;
                OUTER: for (const p of v2) {
                    if (typeof p !== 'string') {
                        throw new Error(`Operator "includes": operand(2) array items should be string.`);
                    }
                    const v1Items = v1.split(';');
                    const v2Items = p.split(';');
                    for (const q of v2Items) {
                        if (! v1Items.includes(q)) {
                            continue OUTER;
                        }
                    }
                    ret = true;
                    break;
                }
                break;
            case 'excludes':
                if (typeof v1 !== 'string') {
                    // NOTE: Emulate SQL's 'not in'; `(null <> null)` always FALSE.
                    ret = false;
                    break;
                }
                if (! Array.isArray(v2)) {
                    throw new Error(`Operator "excludes": operand(2) should be array.`);
                }
                {
                    const v1Items = v1.split(';');
                    for (const p of v2) {
                        if (typeof p !== 'string') {
                            throw new Error(`Operator "excludes": operand(2) array items should be string.`);
                        }
                        const v2Items = p.split(';');
                        let matched = true;
                        for (const q of v2Items) {
                            if (! v1Items.includes(q)) {
                                matched = false;
                                break;
                            }
                        }
                        if (matched) {
                            ret = false;
                            break;
                        }
                    }
                }
                break;
            }
        }
        break;
    }

    return ret;
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function applyWhereConditions(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        conds: PreparedCondition[], records: any[]) {

    const ret: any[] = [];

    if (! records.length) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return ret;
    }
    const fieldNameMap = new Map<string, string>(Object.keys(records[0]).map(x => [x.toLowerCase(), x]));

    NEXTREC: for (const record of records) {
        for (const cond of conds) {
            if (! evalCondition(fieldNameMap, null, false, ctx, cond, record)) {
                continue NEXTREC;
            }
        }
        ret.push(record);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function applyHavingConditions(
        ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        conds: PreparedCondition[], groupedRecsArray: any[][]) {

    const ret: any[][] = [];

    if (! groupedRecsArray.length) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return ret;
    }
    const fieldNameMap = new Map<string, string>(Object.keys(groupedRecsArray[0][0]).map(x => [x.toLowerCase(), x]));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const firstRec = groupedRecsArray[0][0];
    const groupFields = new Map<string, string>(
        ctx.query?.groupBy?.map(w => [w.toLowerCase(), getTrueCaseFieldName(firstRec, w) ?? '']));

    NEXTREC: for (const groupedRecs of groupedRecsArray) {
        for (const cond of conds) {
            if (! evalCondition(fieldNameMap, groupFields, true, ctx, cond, groupedRecs)) {
                continue NEXTREC;
            }
        }
        ret.push(groupedRecs);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
}
