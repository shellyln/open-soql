// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln



export type ComparisonOperators =
    '=' | '!=' | '<' | '<=' | '>' | '>=' |
    'like' | 'not_like' |
    'in' | 'not_in' | 'includes' | 'excludes';


export type LogicalOperators =
    'not' | 'and' | 'or' |
    'true';


export type FieldResultType =
    'any' | 'number' | 'string' | 'boolean' | 'date' | 'datetime';


export interface PreparedDateValue {
    type: 'date';
    value: string;
}


export interface PreparedDateTimeValue {
    type: 'datetime';
    value: string;
}


export type PreparedAtomValue =
    number | string | null | PreparedDateValue | PreparedDateTimeValue;


export type PreparedValue =
    PreparedAtomValue | Array<PreparedAtomValue>;


export interface PreparedFieldBase {
    aliasName?: string | null;
}


export interface PreparedField extends PreparedFieldBase {
    type: 'field';
    name: string[];
}


export interface PreparedFnCall extends PreparedFieldBase {
    type: 'fncall';
    fn: string;
    args: Array<Omit<PreparedField, 'aliasName'> |
            PreparedAtomValue /* | PreparedFnCall */>; // TODO: nested function call
}


export interface PreparedSubQuery extends PreparedFieldBase {
    type: 'subquery';
    query: PreparedQuery;
}


export type PreparedFieldListItem =
    PreparedField | PreparedFnCall | PreparedSubQuery;


export interface PreparedResolver {
    name: string[];
    aliasName: string | null;
    queryFields?: Set<string>;
    queryFieldsMap?: Map<string, PreparedFieldListItem>;
    condFields?: Set<string>;
    condAliasFields?: Set<string>;
    havingCondFields?: Set<string>;
    fieldAliasNames?: Set<string>;
    sortFieldNames?: Set<string>;
    relationshipIdFields?: Set<string>;

    resolver?: QueryResolverFn;
    resolverName?: string;
}


export type PreparedConditionOperand =
    PreparedCondition | PreparedValue | PreparedFieldListItem;


export interface PreparedCondition {
    type: 'condition';
    op: LogicalOperators | ComparisonOperators;
    operands: Array<PreparedConditionOperand>;
}


export interface PreparedOrderByField {
    name: string[];
    direction: 'asc' | 'desc';
    nulls: 'first' | 'last';
}


export interface PreparedQuery {
    select: PreparedFieldListItem[];
    from: PreparedResolver[];
    where?: PreparedCondition[];
    having?: PreparedCondition[];
    groupBy?: string[];
    orderBy?: PreparedOrderByField[];
    limit?: number | null;
    offset?: number | null;
    for?: string[];

    // Followings are for internal use.

    whereSubQueries?: PreparedSubQuery[];
    havingSubQueries?: PreparedSubQuery[];
    selectSubQueries?: PreparedSubQuery[];
}


export interface ExecutionPlan {
    query: PreparedQuery;
    children: ExecutionPlan[];
}


export interface ExecutionPlanRoot {
    children: ExecutionPlan[];
    generations: Array<Promise<any>[]>;
}


export const enum ResolverTreeDirection {
    DetailsToMaster = 1,
    MasterToDetail = 2,
}

export interface ResolverTreeNode {
    fieldOrRelName: string;
    // fkeyIdName: string;
    resolverName: string;
    direction:
        ResolverTreeDirection.DetailsToMaster |
        ResolverTreeDirection.MasterToDetail;
    children: ResolverTreeNode[];
}


export interface ResolverCapabilities {
    filtering: boolean; // for `query` resolvers.
    sorting: boolean;   // for `query` resolvers.
    limit: boolean;     // for `query` resolvers.
    offset: boolean;    // for `query` resolvers.
}


export interface ResolverContext {
    functions: QueryFuncInfo[];
    query?: PreparedQuery;   // DON'T CHANGE any properties from the resolver!
    graphPath: string[];
    resolverName: string;
    parentResolverName?: string;
    parentType?:
        'master' |           // Accessed by `Select (Select childField From details) From Master`
                             //   `details` is called 'child relationship name'.
        'detail';            // Accessed by `Select master__r.childField From Detail`
    parent?: any;            // Parent record. (For resolver function)
    foreignIdField?: string; // [parentType='master'] Select from currentResolver where currentResolver.foreignIdField = parent.idField
                             // [parentType='detail'] Select from currentResolver where currentResolver.idField = parent.foreignIdField
    masterIdField?: string;  // Record id field of master.
    detailIdField?: string;  // Record id field of detail.

    parentRecords?: any[];            // For before/after sub-query events.
    conditions?: PreparedCondition[], // For before/after sub-query events. Same object ref is passed to the resolver function's parameter.

    resolverCapabilities: ResolverCapabilities;
    resolverData: any;       // Resolver's user defined data.
    transactionData: any;    // Transaction user defined data.
}


export interface ResolverEvent extends Partial<ResolverContext> {
    resolverData: any;
    transactionData: any;
}


// export interface HavingConditionComponent { // It is not passed to the resolvers
//     op: ComparisonOperators;
//     fn: string;
//     args: string[];
//     fnResult: number | string | Date | null;
//     value: number | string | Date | null;
// }


export type QueryResolverFn = (
    fields: string[], // NOTE: Relationship fields are not included.
                      //       Function names are not included; functions are called by framework.
    conditions: PreparedCondition[],
    limit: number | null,
    offset: number | null,
    ctx: ResolverContext,
    ) => Promise<any[]>;

export type InsertResolverFn = (
    records: any[],
    ctx: ResolverContext,
    ) => Promise<any[]>;

export type UpdateResolverFn = (
    records: any[],
    ctx: ResolverContext,
    ) => Promise<any[]>;

export type RemoveResolverFn = (
    records: any[],
    ctx: ResolverContext,
    ) => Promise<void>;


export type AggregateFunction =
    (ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        args: Array<PreparedAtomValue | PreparedAtomValue[]>, records: any[]) => any;

export type ScalarFunction =
    (ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        args: PreparedAtomValue[], record: any) => any;

export type ImmediateScalarFunction =
    (ctx: Omit<ResolverContext, 'resolverCapabilities'>,
        args: PreparedAtomValue[]) => any;


export interface AggregateQueryFuncInfo {
    type: 'aggregate';
    name: string;
    fn: AggregateFunction;
}

export interface ScalarQueryFuncInfo {
    type: 'scalar';
    name: string;
    fn: ScalarFunction;
}

export interface ImmediateScalarQueryFuncInfo {
    type: 'immediate-scalar';
    name: string;
    fn: ImmediateScalarFunction;
}

export type QueryFuncInfo =
    AggregateQueryFuncInfo | ScalarQueryFuncInfo | ImmediateScalarQueryFuncInfo;


export interface QueryBuilderInfo {
    /** Additional (user defined) SOQL functions */
    functions?: QueryFuncInfo[];
    rules?: {
        // childRelationshipName?: (s: string) => string;
        // resolverCase?: (s: string) => string;
        // fieldCase?: (s: string) => string;
        idFieldName?: (resolverName: string) => string;
        foreignIdFieldName?: (masterResolverName: string | undefined) => string | undefined;
    };
    /** */
    events?: {
        beginTransaction?: (evt: ResolverEvent) => Promise<void>;
        endTransaction?: (evt: ResolverEvent, err: Error | null) => Promise<void>;
        beginExecute?: (evt: ResolverEvent) => Promise<void>;
        endExecute?: (evt: ResolverEvent, err: Error | null) => Promise<void>;
        beforeMasterSubQueries?: (evt: ResolverEvent) => Promise<void>;
        afterMasterSubQueries?: (evt: ResolverEvent) => Promise<void>;
        beforeDetailSubQueries?: (evt: ResolverEvent) => Promise<void>;
        afterDetailSubQueries?: (evt: ResolverEvent) => Promise<void>;
    };
    /** */
    resolvers: {
        query: {
            /**
             * Object names and Child relation names.
             * Rest names resolverName is '*'.
             */
            [resolverNames: string]: QueryResolverFn;
        };
        // eslint-disable-next-line @typescript-eslint/ban-types
        insert?: {
            [resolverNames: string]: InsertResolverFn;
        };
        // eslint-disable-next-line @typescript-eslint/ban-types
        update?: {
            [resolverNames: string]: UpdateResolverFn;
        };
        // eslint-disable-next-line @typescript-eslint/ban-types
        remove?: {
            [resolverNames: string]: RemoveResolverFn;
        };
    };
    /** */
    relationships?: {
        /**
         * detailResolverName
         * e.g.: Contact: { account: 'Account' }
         *       Contact: { account: { resolver: 'Account', id: 'accountId' } }
         *
         * NOTE: 'Account' is `masterResolverName`.
         *       'account' is `masterObjectFieldName`.
         *       'accountId' is `masterIdName`. (foreign key field name)
         *       `Contact (resolver) -> account (field name)` direction is `Detail to Master`.
         * 
         * masterResolverName
         * e.g.: Account: { contacts: ['Contact'] }
         *       Account: { contacts: ['Contact', 'account'] }
         *
         * NOTE: 'contacts' is details relationship name.
         *       'Contact' is `detailResolverName` and 'account' is Contact's `masterObjectFieldName`.
         *       Default masterObjectFieldName is `MasterResolverName`.
         *       `Account (resolver) -> contacts (relationship name)` direction is `Master to Details`.
         */
        [detailOrMasterResolverNames: string]: {
            [fieldOrRelNames: string]:
                // detailResolver
                string | { resolver: string, id: string } |
                // masterResolver
                [string, string?];
        };
    };
}


export type QueryBuilderInfoInternal = Required<QueryBuilderInfo>;
