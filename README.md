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

// See `src/types.ts` > `QueryBuilderInfo`
const { compile, soql,
        insert, update, remove, touch, notifyRemoved,
        transaction,
        subscribe, unsubscribe, unsubscribeAllBySubscriber } = build({

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
    const { compile, soql, insert, update, remove, touch, notifyRemoved } = commands;

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


### Publish / Subscribe messaging

#### Without a transaction
```ts
const subscriber: Subscriber = ({on, resolver, id}) => {
    switch (on) {
    case 'insert':
        ...
        break;
    case 'update':
        ...
        break;
    case 'remove':
        ...
        break;
    }
};

// Subscribe to all changes of the resolver `Contact`.
subscribe('Contact', null, subscriber);
// Subscribe to all changes of the record `Contact(id='Contact/z2')`.
subscribe('Contact', 'Contact/z2', subscriber);

await update('Contact', [ ... ]); // or insert(), remove(), touch()
// (Fire events on next event loop.)

await update('Contact', [ ... ]);
// (Fire events on next event loop.)

await update('Contact', [ ... ]);
// (Fire events on next event loop.)

...

// Unsubscribe to all changes of the resolver `Contact`.
unsubscribe('Contact', null, subscriber);
// Unsubscribe to all changes of the record `Contact(id='Contact/z2')`.
unsubscribe('Contact', 'Contact/z2', subscriber);
```

#### Within a transaction
```ts
const subscriber: Subscriber = ({on, resolver, id}) => { ... };

// Subscribe to all changes of the resolver `Contact`.
subscribe('Contact', null, subscriber);
// Subscribe to all changes of the record `Contact(id='Contact/z2')`.
subscribe('Contact', 'Contact/z2', subscriber);

await transaction(async (commands, tr) => {
    const { compile, soql, insert, update, remove, touch } = commands;

    await update('Contact', [ ... ]); // or insert(), remove(), touch()
    await update('Contact', [ ... ]);
    await update('Contact', [ ... ]);
});
// (Fire events on next event loop.)

...

// Unsubscribe to all changes of the resolver `Contact`.
unsubscribe('Contact', null, subscriber);
// Unsubscribe to all changes of the record `Contact(id='Contact/z2')`.
unsubscribe('Contact', 'Contact/z2', subscriber);
```


See also the following usage example repositories:  
* [https://github.com/shellyln/open-soql-usage-example](https://github.com/shellyln/open-soql-usage-example)
* [Open SOQL example app with React hooks](https://github.com/shellyln/open-soql-react-hooks-example-app)


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
        * [x] `convertTimezone(field | literal | function call)`
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
* [x] Publish / Subscribe messaging
* [x] transaction scope
* [x] template string


---

## 📖 Usage

### 📦 Module `open-soql/modules/builder`

#### 🟢 `build()`

```ts
export interface QueryBuilderInfo {
    functions?: QueryFuncInfo[];
                // QueryFuncInfo[i].type is 'aggregate' | 'scalar' | 'immediate-scalar'
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

export interface SubscriberParams {
    on: 'insert' | 'update' | 'remove';
    resolver: string;
    id: any | null;
}

export type Subscriber = (params: SubscriberParams) => void;

export function build(builder: QueryBuilderInfo): {
    compile: (strings: TemplateStringsArray | string,
            ...values: Array<PreparedAtomValue | Array<PreparedAtomValue>>) => IQuery;
    soql: (strings: TemplateStringsArray | string,
            ...values: Array<PreparedAtomValue | Array<PreparedAtomValue>>) => Promise<R[]>;
    insert: (resolver: string, obj: T) => Promise<T extends (infer R)[] ? R[] : T>;
    update: (resolver: string, obj: T) => Promise<T extends (infer R)[] ? R[] : T>;
    remove: (resolver: string, obj: T) => Promise<void>;
    touch: (resolver: string, obj: T) => Promise<void>;
    notifyRemoved: (resolver: string, obj: T) => Promise<void>;
    subscribe: (resolver: string, id: any, fn: Subscriber) => void,
    unsubscribe: (resolver: string, id: any, fn: Subscriber) => void,
    unsubscribeAllBySubscriber: (resolver: string, fn: Subscriber) => void,
    transaction: (
            callback: (commands: {
                compile, soql, insert, update, remove, touch
            }, tr: any) => Primise<void>,
            trOptions?: any,
        ) => Primise<void>;
};
```

* Set up the resolvers.

##### parameters:

* `builder`: Resolvers and configurations.

> **NOTICE**:  
> The `immediate-scalar` function does not refer to the fields of a record and
> must be referentially transparent.

> **NOTICE**:  
> If query conditions includes computed fields,
> `QueryResolverFn`'s parameter `conditions` will be `[]`.  
> To get complete conditions, use parameter `ctx.conditions`.  
> You can get transformed conditions that include only the fields you specified
> by using `getIndexFieldConditions()`.

##### returns:

* Functions that execute select queries and DML
  * `compile`: Compile the query.
  * `soql`: Select records.
  * `insert`: Insert record(s).
  * `update`: Update record(s).
  * `remove`: Remove record(s).
  * `touch`: Queues `update` events for subscribers. (to notify remote changes)
  * `notifyRemoved`: Queues `remove` events for subscribers. (to notify remote changes)
  * `subscribe`: Subscribe to publishing events.
  * `unsubscribe`: Unsubscribe to publishing events.
  * `unsubscribeAllBySubscriber`: Unsubscribe to publishing events.
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
    Omit<ResolverContext, 'resolverCapabilities'>,
    conds: PreparedCondition[], records: any[]): any[];
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
    Omit<ResolverContext, 'resolverCapabilities'>,
    conds: PreparedCondition[], groupedRecsArray: any[][]): any[];
```

* Filter groups by `having` conditions.

##### parameters:

* `ctx`: Context object.
* `conds`: `having` conditions.
* `records`: Groups to apply the filter.

##### returns:

* Groups that the filter applied.



#### 🟢 `getIndexFieldConditions()`

```ts
export function getIndexFieldConditions(
    ctx: Pick<ResolverContext, 'params'>,
    conds: PreparedCondition[], indexFieldNames: string[]): PreparedCondition[];
```

* Gets the transformed conditions that include only the fields specified in `indexFieldNames`.

##### parameters:

* `ctx`: Context object.
* `conds`: Original conditions.
* `indexFieldNames`: Index fields.

##### returns:

* Transformed conditions.



#### 🟢 `getSqlConditionString()`

```ts
export interface SqlDialect {
    fieldName: (name: string) => string;
    escapeString: (s: string) => string;
}

export function getSqlConditionString(
    ctx: Pick<ResolverContext, 'params'>,
    conds: PreparedCondition[], dialect: SqlDialect): string;
```

* Get the SQL condition string.

##### parameters:

* `ctx`: Context object.
* `conds`: Conditions for converting to SQL conditions.
* `dialect`: SQL dialect.

##### returns:

* SQL condition string (where clause excludes the `where` keyword).



#### 🟢 `escapeSqlStringLiteral_Std()`

```ts
export function escapeSqlStringLiteral_Std(s: string): string;
```

* Escape the standard SQL string literal. (pass to `SqlDialect`)

##### parameters:

* `s`: string literal.

##### returns:

* Escaped string.



#### 🟢 `escapeSqlStringLiteral_MySql()`

```ts
export function escapeSqlStringLiteral_MySql(s: string): string;
```

* Escape the MySQL string literal. (pass to `SqlDialect`)

##### parameters:

* `s`: string literal.

##### returns:

* Escaped string.



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
