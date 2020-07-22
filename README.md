# Open SOQL

<img src="https://shellyln.github.io/assets/image/open-soql-logo.svg" title="Open SOQL logo" style="width: 100px">

Open source implementation of the [SOQL](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm).  
You can query everything you want by defining the resolvers.

SOQL is an object-oriented query language that allows you to query related data based on an object graph.


> This is an unstable pre-release


## Install

```bash
npm install open-soql
```

## Get started

Set up the resolvers
```ts
import { build } from 'open-soql/modules/exec';


const { soql } = build({
    // See `src/types.ts` > `QueryBuilderInfo`
    resolvers: {
        query: {
            Account: (fields, conditions, limit, offset, ctx) => {
                // fetch the `Account` object data
                const o = {};
                for (const field of fields) {
                    o[field] = `field:${field}/1`;
                }
                return Promise.resolve([{
                    ...o,
                    id: 'Account/1',
                    numOfEmployees: 5,
                    created: '2020-01-02',
                    updated: '2020-01-02',
                }, {
                    ...o,
                    id: 'Account/2',
                    numOfEmployees: 5,
                    created: '2020-01-02',
                    updated: '2020-01-02',
                }]);
            },
            Contact: (fields, conditions, limit, offset, ctx) => {
                // fetch the `Contact` object data
                // `ctx.parent` is a parent record.
                const o = {};
                for (const field of fields) {
                    o[field] = `field:${field}/1`;
                }
                return Promise.resolve([{
                    ...o,
                    id: 'Contact/1',
                }, {
                    ...o,
                    id: 'Contact/2',
                }]);
            },
            Opportunity: (fields, conditions, limit, offset, ctx) => {
                // fetch the `Opportunity` object data.
                // `ctx.parent` is a parent record.
                const o = {};
                for (const field of fields) {
                    o[field] = `field:${field}/1`;
                }
                return Promise.resolve([{
                    ...o,
                    id: 'Opportunity/1',
                    Amount: 10001,
                    DueDate: '2020-01-01',
                }, {
                    ...o,
                    id: 'Opportunity/2',
                    Amount: 10001,
                    DueDate: '2020-01-01',
                }]);
            },
            Event: (fields, conditions, limit, offset, ctx) => {
                // fetch the `Event` object data
                const o = {};
                for (const field of fields) {
                    o[field] = `field:${field}/1`;
                }
                return Promise.resolve([{
                    ...o,
                    id: 'Event/1',
                }]);
            },
        },
    },
    relationships: {
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
        Account: {
            Contacts: ['Contact', 'Account'],                   // master->details relationship
            Opportunities: ['Opportunity', 'Account'],          // master->details relationship
        },
        Contact: {
            Account: { resolver: 'Account', id: 'AccountId' },  // detail->master relationship
        },
        Opportunity: {
            Account: { resolver: 'Account', id: 'AccountId' },  // detail->master relationship
        },
        Event: {
            Account: { resolver: 'Account', id: 'WhatId' },
            Contact: { resolver: 'Contact', id: 'WhatId' },
            Opportunity: { resolver: 'Opportunity', id: 'WhatId' },
        },
    },
});
```

Query
```ts
const result = await soql`
    Select
        acc.id         aid
      , acc.Region     reg
      , acc.Category   cat
      , (
          Select id, Name
          from acc.Opportunities
          where Amount > ${10000}
                         -- It can be number, string, boolean or null.
          order by DueDate desc limit 5
        )
      , string(id)
      , string(foo)
      , string(reg)
      , string(acc.qux)
    from Contact con, con.Account acc
    where
      (
            number(acc.numOfEmployees) = 5
        and acc.created > ${{type: 'date', value: '2020-01-01'}}
                             -- It can be 'date' or 'datetime'.
        and acc.updated > 2020-01-01
      ) or (
            acc.foo = 1
        and acc.bar = 2
        and acc.baz = 2
      ) or not (
            acc.qux = 1
        and acc.quux = 2
        and acc.corge in (Select id from Event)
      )
    order by aid, reg, cat
    limit 10 offset 2
    -- line comment
    /* block comment */
`;
```

Aggregate
```ts
const aggregationResult = await soql`
    Select
        count()
      , count(id) cnt
      , sum(bar) sum
      , cast_string(12345) str
      , cast_number('2234') num
    from
        Contact
    where
        foo > ''
    group by Region
    having count(id) > 0
`;
```

## Features
### Syntax

* `Select` field list
  * [x] detail-master relationship name
  * [x] resolver (relationship) alias name
  * [x] field alias name
  * [x] function call (scalar | immediate_scalar | aggregate)
    * [x] `count`
    * [x] `count_distinct`
    * [ ] `sum`
    * [ ] `avg`
    * [ ] `min`
    * [ ] `max`
    * [ ] `grouping`
    * [ ] `format`
  * [ ] `TYPEOF` expression
* `From` clause
  * [x] resolver (relationship name) alias
* `Where` clause
  * [x] field
  * data types
    * [x] string
    * [x] number
    * [ ] date
    * [ ] datetime
    * [x] null
  * [x] op1 function call (scalar | immediate_scalar)
  * [x] op2 function call (immediate_scalar)
  * [ ] date literals (e.g.: `TODAY`)
  * logical operators
    * [x] `and`
    * [x] `or`
    * [x] `not`
  * comparison operators
    * [x] `=`
    * [x] `!=`
    * [x] `<`
    * [x] `<=`
    * [x] `>`
    * [x] `>=`
    * [ ] `like`
    * [ ] `not_like`
    * [x] `in`
    * [x] `not_in`
    * [ ] `includes`
    * [ ] `excludes`
* `Having` clause
  * [x] field
  * data types
    * [x] string
    * [x] number
    * [ ] date
    * [ ] datetime
    * [x] null
  * [x] op1 function call (immediate_scalar | aggregate)
  * [x] op2 function call (immediate_scalar)
  * [ ] date literals (e.g.: `TODAY`)
  * logical operators
    * [x] `and`
    * [x] `or`
    * [x] `not`
  * comparison operators
    * [x] `=`
    * [x] `!=`
    * [x] `<`
    * [x] `<=`
    * [x] `>`
    * [x] `>=`
    * [ ] `like`
    * [ ] `not_like`
    * [x] `in`
    * [x] `not_in`
    * [ ] `includes`
    * [ ] `excludes`
* `Group by` clause
    * [x] fields
    * [x] field alias name
    * [ ] `ROLLUP`
    * [ ] `CUBE`
* `Order by` clause
    * [x] fields
    * [x] resolver (relationship) alias name
    * [x] field alias name
    * [x] asc/desc
    * [x] nulls first/last
* [ ] `Using scope` clause
* [x] `Limit` clause
* [x] `Offset` clause
* [ ] `With` clause
* [ ] `For` clause

### Other features
* [ ] DML
* [x] Template string


---

## Usage

### Module 'open-soql/modules/exec'

#### build(builder)

```ts
export interface QueryBuilderInfo {
    functions?: QueryFuncInfo[];
    rules?: {
        idFieldName?: (resolverName: string) => string;
        masterIdFieldName?: (masterResolverName: string | undefined) => string | undefined;
    };
    events?: {
        beginExecute?: (evt: ResolverEvent) => Promise<void>;
        endExecute?: (evt: ResolverEvent) => Promise<void>;
        beforeMasterSubQueries?: (evt: ResolverEvent) => Promise<void>;
        afterMasterSubQueries?: (evt: ResolverEvent) => Promise<void>;
        beforeDetailSubQueries?: (evt: ResolverEvent) => Promise<void>;
        afterDetailSubQueries?: (evt: ResolverEvent) => Promise<void>;
    };
    resolvers: {
        query: {
            [resolverNames: string]: QueryResolverFn;
        };
        create?: { /* Not designed yet */ };
        update?: { /* Not designed yet */ };
        remove?: { /* Not designed yet */ };
    };
    relationships: {
        [detailOrMasterResolverNames: string]: {
            [fieldOrRelNames: string]:
                string | { resolver: string, id: string } | [string, string?];
        };
    };
}

export function build(builder: QueryBuilderInfo): {
    soql: (strings: TemplateStringsArray | string, ...values: any[]) => Promise<any[]>;
    insert: (resolver: string, obj: object | object[]) => undefined;
    update: (resolver: string, obj: object | object[]) => undefined;
    remove: (resolver: string, obj: object | object[]) => undefined;
};
```

* Set up the resolvers.

##### parameters:

* builder: Resolvers and configurations.

##### returns:

* Functions that execute select queries and DML
  * soql: Select records.
  * insert: Insert record(s).
  * update: Update record(s).
  * remove: Remove record(s).



### Module 'open-soql/modules/filter'

#### applyWhereConditions

```ts
export function applyWhereConditions(
    ctx: ResolverContext, conds: PreparedCondition[], records: any[]): any[];
```

* Filter records by `where` conditions.

##### parameters:

* ctx: Context object.
* conds: `where` conditions.
* records: Records to apply the filter.

##### returns:

* Records that the filter applied.



#### applyHavingConditions

```ts
export function applyHavingConditions(
    ctx: ResolverContext, conds: PreparedCondition[], groupedRecsArray: any[][]): any[];
```

* Filter groups by `having` conditions.

##### parameters:

* ctx: Context object.
* conds: `having` conditions.
* records: Groups to apply the filter.

##### returns:

* Groups that the filter applied.



---

## FAQ

* What does `SOQL` stand for?
  * In `Open SOQL`, `SOQL` stands for `SOQL is Object Query Language`.
    * In [original SOQL](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm), `SOQL` stands for `Salesforce Object Query Language`.


---

## License
ISC  
Copyright (c) 2020 Shellyl_N and Authors
