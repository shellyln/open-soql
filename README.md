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
import { build }                      from 'open-soql/modules/builder';
import { staticJsonResolverBuilder,
         staticCsvResolverBuilder,
         passThroughResolverBuilder } from 'open-soql/modules/resolvers';

const { soql, insert, update, remove, transaction } = build({
    // See `src/types.ts` > `QueryBuilderInfo`
    functions: [{ // optional: For defining custom functions.
        type: 'scalar',
        name: 'string',
        fn: (ctx, args, records) => {
            return String(args[0]);
        },
    }, {
        type: 'scalar',
        name: 'number',
        fn: (ctx, args, records) => {
            return Number(args[0]);
        },
    }, {
        type: 'immediate-scalar',
        name: 'cast_string',
        fn: (ctx, args) => {
            return String(args[0]);
        },
    }, {
        type: 'immediate-scalar',
        name: 'cast_number',
        fn: (ctx, args) => {
            return Number(args[0]);
        },
    }, {
        type: 'aggregate',
        name: 'count_twice',
        fn: (ctx, args, records) => {
            return records.length * 2;
        },
    }],
    events: { // optional: For resolving transaction and N+1 query problem.
        beginTransaction: (evt) => Promise.resolve(),
        endTransaction: (evt, err) => Promise.resolve(),
        beginExecute: (evt) => Promise.resolve(),
        endExecute: (evt, err) => Promise.resolve(),
        beforeMasterSubQueries: (evt) => Promise.resolve(),
        afterMasterSubQueries: (evt) => Promise.resolve(),
        beforeDetailSubQueries: (evt) => Promise.resolve(),
        afterDetailSubQueries: (evt) => Promise.resolve(),
    },
    resolvers: {
        query: {
            Account: (fields, conditions, limit, offset, ctx) => {
                // Fetch the `Account` object data.
                ctx.resolverCapabilities.filtering = true; // True if the resolver can filter records.
                return Promise.resolve([{ ... }, ... ]);
            },
            Contact: (fields, conditions, limit, offset, ctx) => {
                // Fetch the `Contact` object data.
                // `ctx.parent` is a parent record.
                ctx.resolverCapabilities.filtering = true; // True if the resolver can filter records.
                return Promise.resolve([{ ... }, ... ]);
            },
            Opportunity: (fields, conditions, limit, offset, ctx) => {
                // Fetch the `Opportunity` object data.
                // `ctx.parent` is a parent record.
                ctx.resolverCapabilities.filtering = true; // True if the resolver can filter records.
                return Promise.resolve([{ ... }, ... ]);
            },
            Event: staticCsvResolverBuilder(  // (CSV string)
                                              // "staticJsonResolverBuilder"(JSON string) and
                                              // "passThroughResolverBuilder"(array of object)
                                              // are also available.
                'Event', () => Promise.resolve(`
                    Id,      Subject, WhatId
                    Event/1, Email,   Account/1
                    Event/2, Phone,   Contact/1
                `)
            ),
        },
        insert: { // optional: For DML
            Contact: (records, ctx) => {
                return Promise.resolve(records.map((x, i) => ({...x, id: `Contact/${i}`})));
            },
        },
        update: { // optional: For DML
            Contact: (records, ctx) => {
                return Promise.resolve(records);
            },
        },
        remove: { // optional: For DML
            Contact: (records, ctx) => {
                return Promise.resolve();
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
// result is [{...}, ...]
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
// aggregationResult is [{...}, ...]
```

DML
```ts
const inserted = await insert('Contact', [{
    Name: 'foo',
}]);
// inserted is [{ Id: 'Contact/1', Name: 'foo' }]

const updated = await update('Contact', inserted);
// updated is [{ Id: 'Contact/1', Name: 'foo' }]

await remove('Contact', updated);

const selected = await soql`Select Id, Name from Contact`;
const updated2 = await update('Contact', selected);
```

Execute commands within a transaction
```ts
await transaction(async (commands, tr) => {
    const { soql, insert, update, remove } = commands;

    const inserted = await insert('Contact', [{
        Name: 'foo',
    }]);
    const selected = await soql`Select Id, Name from Contact`;
    const updated = await update('Contact', selected);
    await remove('Contact', updated);
});
```


## Features
### Syntax

* `Select` field list
  * [x] detail-master relationship name
  * [x] resolver (relationship) alias name
  * [x] field alias name
  * [x] function call (aggregate | scalar | immediate_scalar)
  * [ ] nested function call (call functions in actual parameters of functions)
  * functions
    * Aggregate functions
      * [x] `count()`, `count(field)`
      * [x] `count_distinct(field)`
      * [x] `sum(field)`
      * [x] `avg(field)`
      * [x] `min(field)`
      * [x] `max(field)`
      * [ ] `grouping(field)`
    * Scalar functions
      * String functions
        * [ ] `format(field | function call)`
      * Date and datetime functions (UTC)
        * [ ] `convertTimezone(field)`
        * [x] `calendar_month(field | convertTimezone(field))`
        * [x] `calendar_quarter(field | convertTimezone(field))`
        * [x] `calendar_year(field | convertTimezone(field))`
        * [x] `day_in_month(field | convertTimezone(field))`
        * [x] `day_in_week(field | convertTimezone(field))`
        * [x] `day_in_year(field | convertTimezone(field))`
        * [x] `day_only(field | convertTimezone(field))`
        * [ ] `fiscal_month(field | convertTimezone(field))`
        * [ ] `fiscal_quarter(field | convertTimezone(field))`
        * [ ] `fiscal_year(field | convertTimezone(field))`
        * [x] `hour_in_day(field | convertTimezone(field))`
        * [x] `week_in_month(field | convertTimezone(field))`
        * [x] `week_in_year(field | convertTimezone(field))`
      * Date and datetime functions (local timezone)
        * [x] `calendar_month_lc(field)`
        * [x] `calendar_quarter_lc(field)`
        * [x] `calendar_year_lc(field)`
        * [x] `day_in_month_lc(field)`
        * [x] `day_in_week_lc(field)`
        * [x] `day_in_year_lc(field)`
        * [x] `day_only_lc(field)`
        * [ ] `fiscal_month_lc(field)`
        * [ ] `fiscal_quarter_lc(field)`
        * [ ] `fiscal_year_lc(field)`
        * [x] `hour_in_day_lc(field)`
        * [x] `week_in_month_lc(field)`
        * [x] `week_in_year_lc(field)`
  * [ ] `TYPEOF` expression
* field expressions
  * [x] field
  * [x] field alias name
  * data types
    * [x] string
    * [x] number
    * [x] date
    * [x] datetime
    * [x] null
* `From` clause
  * [x] resolver (relationship name) alias
* `Where` clause
  * [x] field
  * data types
    * [x] string
    * [x] number
    * [x] date
    * [x] datetime
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
    * [x] `like`
    * [x] `not_like`
    * [x] `in`
    * [x] `not_in`
    * [x] `includes`
    * [x] `excludes`
* `Having` clause
  * [x] field
  * data types
    * [x] string
    * [x] number
    * [x] date
    * [x] datetime
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
    * [x] `like`
    * [x] `not_like`
    * [x] `in`
    * [x] `not_in`
    * [x] `includes`
    * [x] `excludes`
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
* [x] `For` clause

### Other features
* [ ] prepared query (pre-compiled query)
* standard query resolvers
  * [x] JSON string
  * [x] CSV string
  * [x] Array of object
* DML
  * [x] `insert`
  * [x] `update`
  * [x] `remove`
* [x] transaction scope
* [x] template string


---

## Usage

### Module `open-soql/modules/builder`

#### `build()`

```ts
export interface QueryBuilderInfo {
    functions?: QueryFuncInfo[];
    rules?: {
        idFieldName?: (resolverName: string) => string;
        foreignIdFieldName?: (masterResolverName: string | undefined) => string | undefined;
    };
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
    resolvers: {
        query: {
            [resolverNames: string]: QueryResolverFn;
        };
        insert?: {
            [resolverNames: string]: InsertResolverFn;
        };
        update?: {
            [resolverNames: string]: UpdateResolverFn;
        };
        remove?: {
            [resolverNames: string]: RemoveResolverFn;
        };
    };
    relationships: {
        [detailOrMasterResolverNames: string]: {
            [fieldOrRelNames: string]:
                string | { resolver: string, id: string } | [string, string?];
        };
    };
}

export function build(builder: QueryBuilderInfo): {
    soql: (strings: TemplateStringsArray | string, ...values: any[]) => Promise<R[]>;
    insert: (resolver: string, obj: T) => Promise<T extends (infer R)[] ? R[] : T>;
    update: (resolver: string, obj: T) => Promise<T extends (infer R)[] ? R[] : T>;
    remove: (resolver: string, obj: T) => Promise<void>;
    transaction: (
            callback: (commands: {
                soql, insert, update, remove
            }, tr: any) => Primise<void>
        ) => Primise<void>;
};
```

* Setup the resolvers.

##### parameters:

* `builder`: Resolvers and configurations.

##### returns:

* Functions that execute select queries and DML
  * `soql`: Select records.
  * `insert`: Insert record(s).
  * `update`: Update record(s).
  * `remove`: Remove record(s).
  * `transaction`: Execute commands within a transaction.



### Module `open-soql/modules/filters`

#### `applyWhereConditions()`

```ts
export function applyWhereConditions(
    ctx: ResolverContext, conds: PreparedCondition[], records: any[]): any[];
```

* Filter records by `where` conditions.

##### parameters:

* `ctx`: Context object.
* `conds`: `where` conditions.
* `records`: Records to apply the filter.

##### returns:

* Records that the filter applied.



#### `applyHavingConditions()`

```ts
export function applyHavingConditions(
    ctx: ResolverContext, conds: PreparedCondition[], groupedRecsArray: any[][]): any[];
```

* Filter groups by `having` conditions.

##### parameters:

* `ctx`: Context object.
* `conds`: `having` conditions.
* `records`: Groups to apply the filter.

##### returns:

* Groups that the filter applied.



### Module `open-soql/modules/resolvers`

#### `staticJsonResolverBuilder()`

```ts
export const staticJsonResolverBuilder:
    (resolverName: string, fetcher: () => Promise<string>) => QueryResolverFn;
```

* Generate the query resolver for static JSON data.

##### parameters:

* `resolverName`: Resolver name.
* `fetcher`: The function that returns promise of data.

##### returns:

* Query resolver.



#### `staticCsvResolverBuilder()`

```ts
export const staticCsvResolverBuilder:
    (resolverName: string, fetcher: () => Promise<string>) => QueryResolverFn;
```

* Generate the query resolver for static CSV data.

##### parameters:

* `resolverName`: Resolver name.
* `fetcher`: The function that returns promise of data.

##### returns:

* Query resolver.



#### `passThroughResolverBuilder()`

```ts
export const passThroughResolverBuilder:
    (resolverName: string, fetcher: () => Promise<any[]>) => QueryResolverFn;
```

* Generate the query resolver for static object array data.

##### parameters:

* `resolverName`: Resolver name.
* `fetcher`: The function that returns promise of data.

##### returns:

* Query resolver.



---

## FAQ

* What does `SOQL` stand for?
  * In `Open SOQL`, `SOQL` stands for `SOQL is Object Query Language`.
    * In [original SOQL](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm), `SOQL` stands for `Salesforce Object Query Language`.


---

## License
ISC  
Copyright (c) 2020 Shellyl_N and Authors
