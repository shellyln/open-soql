// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { ResolverContext,
         FieldResultType,
         QueryFuncInfo,
         PreparedConditionOperand,
         PreparedCondition,
         PreparedFnCall } from '../types';



export interface CondOp1CacheValue {
    isField: boolean,
    isDateOrDatetime: boolean,
    op: PreparedConditionOperand,
    op2FieldResultType: FieldResultType,
    fnInfo: QueryFuncInfo | null,
    fn: (fieldNameMap: Map<string, string>, ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        cache: CondOp1CacheValue, record: any) => any,
}

export interface MemoizedValue {
    value: any,
}


export const condOp1FnCache = new WeakMap<PreparedCondition, CondOp1CacheValue>();

export const condOp2ValueCache = new WeakMap<PreparedCondition, MemoizedValue>();

export const nestedFnInfoCache = new WeakMap<PreparedFnCall, QueryFuncInfo>();

export const memoizedFnCache = new WeakMap<PreparedFnCall['args'], MemoizedValue>();
