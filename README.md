# Open SOQL

<img src="https://shellyln.github.io/assets/image/open-soql-logo.svg" title="Open SOQL logo" style="width: 100px">

Open source implementation of the [SOQL](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm).  
You can query everything you want by defining the resolvers.

SOQL is an object-oriented query language that allows you to query related data based on an object graph.


[![npm](https://img.shields.io/npm/v/open-soql.svg)](https://www.npmjs.com/package/open-soql)
[![GitHub release](https://img.shields.io/github/release/shellyln/open-soql.svg)](https://github.com/shellyln/open-soql/releases)
[![.github/workflows/test.yml](https://github.com/shellyln/open-soql/workflows/.github/workflows/test.yml/badge.svg)](https://github.com/shellyln/open-soql/actions)
[![GitHub forks](https://img.shields.io/github/forks/shellyln/open-soql.svg?style=social&label=Fork)](https://github.com/shellyln/open-soql/fork)
[![GitHub stars](https://img.shields.io/github/stars/shellyln/open-soql.svg?style=social&label=Star)](https://github.com/shellyln/open-soql)

---

## Table of contents

* [Install](#%EF%B8%8F-install)
* [Getting started](#-getting-started)
* [Features](#-features)
* [Usage](#-usage)
* [FAQ](#-faq)
* [License](#%EF%B8%8F-license)

---

## ⚙️ Install

```bash
npm install open-soql
```

## 🚀 Getting started

### Set up the resolvers
```ts
import { build }                      from 'open-soql/modules/builder';
import { staticJsonResolverBuilder,
         staticCsvResolverBuilder,
         passThroughResolverBuilder } from 'open-soql/modules/resolvers';

const { compile, soql, insert, update, remove, transaction } = build({
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
    relationships: { // optional: For relationship query
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
            Contacts: ['Contact'],                      // master->details relationship
            Opportunities: ['Opportunity', 'Account'],  // master->details relationship
        },                                              //     (Explicitly specify relationship item)
        Contact: {
            Account: 'Account',                         // detail->master relationship
        },
        Opportunity: {
            Account: 'Account',                         // detail->master relationship
        },
        Event: {
            Account: { resolver: 'Account', id: 'WhatId' },  // detail->master relationship
            Contact: { resolver: 'Contact', id: 'WhatId' },  //     (Explicitly specify Id item)
            Opportunity: { resolver: 'Opportunity', id: 'WhatId' },
        },
    },
});
```

### Query
```ts
const result = await soql<Partial<Contact>>`
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

### Pre-compiled query

* Non-parameterized query.  
  (Template literal parameters will be interpreted before compiling.)
```ts
const query = compile`Select id from account where id > ${'100'}`;
const result = await query.execute<Partial<Account>>();
```

* Named parameterized query.
```ts
const query = compile`Select id from account where id > :idGreaterThan`;
const result = await query.execute<Partial<Account>>({ idGreaterThan: '100' });
```

> You can use parameters on the right side of the conditional expression, function arguments, limit, and offset.

### Aggregate
```ts
const aggregationResult = await soql<ContactAgg>`
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

### DML (bulk)
```ts
const inserted = await insert('Contact', [{
    Name: 'foo',
}]);
// inserted is [{ Id: 'Contact/1', Name: 'foo' }]

const updated = await update('Contact', inserted);
// updated is [{ Id: 'Contact/1', Name: 'foo' }]

await remove('Contact', updated);

const selected = await soql<Partial<Contact>>`Select Id, Name from Contact`;
const updated2 = await update('Contact', selected);
```

### DML (single record)
```ts
const inserted = await insert('Contact', {
    Name: 'foo',
});
// inserted is { Id: 'Contact/1', Name: 'foo' }

const updated = await update('Contact', inserted);
// updated is { Id: 'Contact/1', Name: 'foo' }

await remove('Contact', updated);
```

### Execute commands within a transaction
```ts
await transaction(async (commands, tr) => {
    const { compile, soql, insert, update, remove } = commands;

    const inserted = await insert('Contact', [{
        Name: 'foo',
    }]);
    const selected = await soql<Partial<Contact>>`Select Id, Name from Contact`;
    const updated = await update('Contact', selected);
    await remove('Contact', updated);

    const query = compile`Select id from account where id > ${'100'}`;
    const selectedAccounts = await query.execute<Partial<Account>>();
});
```

See also usage example repo.  
[https://github.com/shellyln/open-soql-usage-example](https://github.com/shellyln/open-soql-usage-example)


## 💎 Features
### Syntax

* `Select` field list
  * [x] detail-master relationship name
  * [x] resolver (relationship) alias name
  * [x] field alias name
  * [x] function call (aggregate | scalar | immediate_scalar)
  * [x] nested function call (call functions in actual parameters of functions)
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
        * [ ] `format(field | literal | function call)`
        * [x] `concat(field | literal | function call, ...)`
      * Cast functions
        * [x] `cast_to_string(field | literal | function call)`
        * [x] `cast_to_number(field | literal | function call)`
        * [x] `cast_to_boolean(field | literal | function call)`
      * Calc functions
        * [x] `add(field | literal | function call, ...)`
        * [x] `sub(field | literal | function call, ...)`
        * [x] `mul(field | literal | function call, ...)`
        * [x] `div(field | literal | function call, ...)`
        * [x] `mod(field | literal | function call, ...)`
      * Date and datetime functions (UTC)
        * [ ] `convertTimezone(field | literal | function call)`
        * [x] `calendar_month(field | literal | convertTimezone(field) | function call)`
        * [x] `calendar_quarter(field | literal | convertTimezone(field) | function call)`
        * [x] `calendar_year(field | literal | convertTimezone(field) | function call)`
        * [x] `day_in_month(field | literal | convertTimezone(field) | function call)`
        * [x] `day_in_week(field | literal | convertTimezone(field) | function call)`
        * [x] `day_in_year(field | literal | convertTimezone(field) | function call)`
        * [x] `day_only(field | literal | convertTimezone(field) | function call)`
        * [ ] `fiscal_month(field | literal | convertTimezone(field) | function call)`
        * [ ] `fiscal_quarter(field | literal | convertTimezone(field) | function call)`
        * [ ] `fiscal_year(field | literal | convertTimezone(field) | function call)`
        * [x] `hour_in_day(field | literal | convertTimezone(field) | function call)`
        * [x] `week_in_month(field | literal | convertTimezone(field) | function call)`
        * [x] `week_in_year(field | literal | convertTimezone(field) | function call)`
      * Date and datetime functions (local timezone)
        * [x] `calendar_month_lc(field | literal | function call)`
        * [x] `calendar_quarter_lc(field | literal | function call)`
        * [x] `calendar_year_lc(field | literal | function call)`
        * [x] `day_in_month_lc(field | literal | function call)`
        * [x] `day_in_week_lc(field | literal | function call)`
        * [x] `day_in_year_lc(field | literal | function call)`
        * [x] `day_only_lc(field | literal | function call)`
        * [ ] `fiscal_month_lc(field | literal | function call)`
        * [ ] `fiscal_quarter_lc(field | literal | function call)`
        * [ ] `fiscal_year_lc(field | literal | function call)`
        * [x] `hour_in_day_lc(field | literal | function call)`
        * [x] `week_in_month_lc(field | literal | function call)`
        * [x] `week_in_year_lc(field | literal | function call)`
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
* [x] prepared query (pre-compiled query)
  * [x] named parameterized query
* standard query resolvers
  * [x] JSON string
  * [x] CSV string
  * [x] Array of object
* DML
  * [x] `insert`
  * [x] `update`
  * [x] `remove`
* [ ] Pub / Sub (subscribe to DML events with filtering conditions)
* [x] transaction scope
* [x] template string


---

## 📖 Usage

### 📦 Module `open-soql/modules/builder`

#### 🟢 `build()`

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
    relationships?: {
        [detailOrMasterResolverNames: string]: {
            [fieldOrRelNames: string]:
                string | { resolver: string, id: string } | [string, string?];
        };
    };
}

export interface IQuery {
    public execute<R>(
        params?: {
            [paramNames: string]:
                number | string | null |
                Array<number | string | null>
        }): Promise<R[]>;
}

export function build(builder: QueryBuilderInfo): {
    compile: (strings: TemplateStringsArray | string, ...values: any[]) => IQuery;
    soql: (strings: TemplateStringsArray | string, ...values: any[]) => Promise<R[]>;
    insert: (resolver: string, obj: T) => Promise<T extends (infer R)[] ? R[] : T>;
    update: (resolver: string, obj: T) => Promise<T extends (infer R)[] ? R[] : T>;
    remove: (resolver: string, obj: T) => Promise<void>;
    transaction: (
            callback: (commands: {
                compile, soql, insert, update, remove
            }, tr: any) => Primise<void>,
            trOptions?: any,
        ) => Primise<void>;
};
```

* Set up the resolvers.

##### parameters:

* `builder`: Resolvers and configurations.

##### returns:

* Functions that execute select queries and DML
  * `compile`: Compile the query.
  * `soql`: Select records.
  * `insert`: Insert record(s).
  * `update`: Update record(s).
  * `remove`: Remove record(s).
  * `transaction`: Execute commands within a transaction.



### 📦 Module `open-soql/modules/sort`

#### 🟢 `sortRecords()`

```ts
export function sortRecords(query: PreparedQuery, records: any[]): any[];
```

* Sort records.

##### parameters:

* `query`: Prepared query object.
* `records`: Records to sort.

##### returns:

* Sorted records.



### 📦 Module `open-soql/modules/filters`

#### 🟢 `applyWhereConditions()`

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



#### 🟢 `applyHavingConditions()`

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



### 📦 Module `open-soql/modules/resolvers`

#### 🟢 `staticJsonResolverBuilder()`

```ts
export interface StaticResolverConfig {
    noCache?: boolean;
    noFiltering?: boolean;
    noSorting?: boolean;
}

export const staticJsonResolverBuilder:
    (resolverName: string, fetcher: () => Promise<string>,
     config?: StaticResolverConfig) => QueryResolverFn;
```

* Generate the query resolver for static JSON data.

##### parameters:

* `resolverName`: Resolver name.
* `fetcher`: The function that returns promise of data.

##### returns:

* Query resolver.



#### 🟢 `staticCsvResolverBuilder()`

```ts
export const staticCsvResolverBuilder:
    (resolverName: string, fetcher: () => Promise<string>,
     config?: StaticResolverConfig) => QueryResolverFn;
```

* Generate the query resolver for static CSV data.

##### parameters:

* `resolverName`: Resolver name.
* `fetcher`: The function that returns promise of data.

##### returns:

* Query resolver.



#### 🟢 `passThroughResolverBuilder()`

```ts
export const passThroughResolverBuilder:
    (resolverName: string, fetcher: () => Promise<any[]>,
     config?: StaticResolverConfig) => QueryResolverFn;
```

* Generate the query resolver for static object array data.

##### parameters:

* `resolverName`: Resolver name.
* `fetcher`: The function that returns promise of data.

##### returns:

* Query resolver.



---

## 🙋 FAQ

* What does `SOQL` stand for?
  * 👉 In `Open SOQL`, `SOQL` stands for `SOQL is Object Query Language`.
  * 👉 In [original SOQL](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm), `SOQL` stands for `Salesforce Object Query Language`.


---

## ⚖️ License
ISC  
Copyright (c) 2020 Shellyl_N and Authors
