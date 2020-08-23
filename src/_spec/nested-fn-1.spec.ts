// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { parse }                    from '../lib/parser';
import { prepareQuery,
         prepareBuilderInfo }       from '../lib/prepare';
import { getObjectValue }           from '../lib/util';
import { QueryBuilderInfoInternal } from '../types';
import { build }                    from '../builder';
import { setDefaultStaticResolverConfig,
         staticJsonResolverBuilder,
         staticCsvResolverBuilder,
         passThroughResolverBuilder } from '../resolvers';
import { resolverConfigs }            from './helpers/config';



const commands1 = build({
    functions: [{
        type: 'scalar',
        name: 'testspec_string_concat',
        fn: (ctx, args, records) => {
            return args.map(c => String(c)).join('');
        },
    }, {
        type: 'scalar',
        name: 'testspec_string_twice',
        fn: (ctx, args, records) => {
            return String(args[0]) + String(args[0]);
        },
    }, {
        type: 'scalar',
        name: 'testspec_number_add',
        fn: (ctx, args, records) => {
            return args.map(c => Number(c)).reduce((a, b) => a + b);
        },
    }, {
        type: 'scalar',
        name: 'testspec_twice',
        fn: (ctx, args, records) => {
            return Number(args[0]) * 2;
        },
    }, {
        type: 'immediate-scalar',
        name: 'testspec_pass_thru',
        fn: (ctx, args) => {
            return args[0];
        },
    }],
    relationships: {
        Account: {
            Contacts: ['Contact'],
            // Contacts: ['Contact', 'Account'],
            Opportunities: ['Opportunity'],
            // Opportunities: ['Opportunity', 'Account'],
        },
        Contact: {
            Account: 'Account',
            // Account: { resolver: 'Account', id: 'AccountId' },
        },
        Opportunity: {
            Account: 'Account',
            // Account: { resolver: 'Account', id: 'AccountId' },
        },
        Event: {
            Account: { resolver: 'Account', id: 'WhatId' },
            Contact: { resolver: 'Contact', id: 'WhatId' },
            Opportunity: { resolver: 'Opportunity', id: 'WhatId' },
        },
    },
    resolvers: {
        query: {
            Contact: staticCsvResolverBuilder(
                'Contact', () => Promise.resolve(`
                    Id         , Foo      , Bar      , Baz      , Qux , Quux  ,   Corge , Grault       , Garply                 , AccountId
                    Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   ,     , false ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   , Account/z1
                    Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   ,     , true  ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z1
                    Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" ,     ,       ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" , "Account/z2"
                    Contact/z4 , aaa/z4   , bbb/z4   , ccc/z4   ,     ,       ,     3.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z2
                    Contact/z5 , aaa/z5   , bbb/z5   , ccc/z5   ,     ,       ,     5.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z3
                    Contact/z6 , aaa/z6   , bbb/z6   , ccc/z6   ,     ,       ,     7.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z3
                    Contact/z7 , aaa/z7   , bbb/z7   , ccc/z7   ,     ,       ,    11.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z3
                    Contact/z8 ,          ,          ,          ,     ,       ,         ,              ,                        ,
                    Contact/z9 ,       "" ,       "" ,      " " ,     ,       ,         ,              ,                        ,
                `)
            ),
            Account: staticCsvResolverBuilder(
                'Account', () => Promise.resolve(`
                    Id         , Name     , Address
                    Account/z1 , fff/z1   , ggg/z1
                    Account/z2 , fff/z2   , ggg/z2
                    Account/z3 , "fff/z3" , "ggg/z3"
                    Account/z4 ,          ,
                    Account/z5 ,       "" ,       ""
                `)
            ),
            Opportunity: staticCsvResolverBuilder(
                'Opportunity', () => Promise.resolve(`
                    Id             , Name     , Amount , AccountId
                    Opportunity/z1 , hhh/z1   ,   1000 , Account/z1
                    Opportunity/z2 , hhh/z2   ,   2000 , Account/z1
                    Opportunity/z3 , "hhh/z3" ,   3000 , Account/z2
                    Opportunity/z4 ,          ,        ,
                    Opportunity/z5 , ""       ,      0 , Account/z2
                `)
            ),
            Event: staticCsvResolverBuilder(
                'Event', () => Promise.resolve(`
                    Id         , Title    , Address  , WhatId
                    Event/z1   , iii/z1   , jjj/z1   , Account/z2
                    Event/z2   , iii/z2   , jjj/z2   , Contact/z2
                    Event/z3   , "iii/z3" , "jjj/z3" , Contact/z3
                    Event/z4   ,          ,          ,
                    Event/z5   ,       "" ,       "" , Opportunity/z5
                `)
            ),
        },
    },
});


describe("nested-fn-1", function() {
    it("Nested function call: scalar (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        concat(
                            testspec_string_twice(foo),
                            ';',
                            testspec_string_twice(corge),
                            testspec_pass_thru('!')
                        ) expr_a
                    from contact
                    where id='Contact/z1'
                    `;
                const expects = [
                    { expr_a: 'aaa/z1aaa/z1;-1-1!' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        concat(
                            testspec_string_twice(foo),
                            ';',
                            testspec_pass_thru(testspec_string_twice(bar)),
                            ';',
                            testspec_string_twice(corge),
                            ';',
                            testspec_pass_thru(testspec_string_twice(quux)),
                            testspec_pass_thru('!'),
                            testspec_string_twice(testspec_pass_thru('?'))
                        ) expr_a
                    from contact
                    where id='Contact/z1'
                    `;
                const expects = [
                    { expr_a: 'aaa/z1aaa/z1;bbb/z1bbb/z1;-1-1;falsefalse!??' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });

    it("Nested function call: scalar (2)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        id
                    from contact
                    where
                        concat(
                            testspec_string_twice(foo),
                            ';',
                            testspec_string_twice(corge),
                            testspec_pass_thru('!')
                        ) = 'aaa/z1aaa/z1;-1-1!'
                    `;
                const expects = [
                    { Id: 'Contact/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        id
                    from contact
                    where
                        concat(
                            testspec_string_twice(foo),
                            ';',
                            testspec_pass_thru(testspec_string_twice(bar)),
                            ';',
                            testspec_string_twice(corge),
                            ';',
                            testspec_pass_thru(testspec_string_twice(quux)),
                            testspec_pass_thru('!'),
                            testspec_string_twice(testspec_pass_thru('?'))
                        ) = 'aaa/z1aaa/z1;bbb/z1bbb/z1;-1-1;falsefalse!??'
                    `;
                const expects = [
                    { Id: 'Contact/z1' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });

    it("Nested function call: aggregate (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        accountid,
                        testspec_pass_thru('qwerty') expr_a,
                        testspec_pass_thru(min(bar)) expr_b,
                        testspec_pass_thru(
                            min(
                                testspec_string_concat(bar)
                            )
                        ) expr_c,
                        testspec_pass_thru(
                            min(
                                testspec_pass_thru(testspec_string_concat(bar))
                            )
                        ) expr_d,
                        testspec_pass_thru(
                            min(
                                concat(
                                    testspec_pass_thru(testspec_string_twice(bar)),
                                    ';',
                                    testspec_pass_thru(testspec_string_twice(baz))
                                )
                            )
                        ) expr_e,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_a: 'qwerty', expr_b: 'bbb/z1', expr_c: 'bbb/z1', expr_d: 'bbb/z1', expr_e: 'bbb/z1bbb/z1;ccc/z1ccc/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z2', expr_a: 'qwerty', expr_b: 'bbb/z3', expr_c: 'bbb/z3', expr_d: 'bbb/z3', expr_e: 'bbb/z3bbb/z3;ccc/z3ccc/z3', expr_foo: 'aaa/z3' },
                    { AccountId: 'Account/z3', expr_a: 'qwerty', expr_b: 'bbb/z5', expr_c: 'bbb/z5', expr_d: 'bbb/z5', expr_e: 'bbb/z5bbb/z5;ccc/z5ccc/z5', expr_foo: 'aaa/z5' },
                    { AccountId: null        , expr_a: 'qwerty', expr_b: null    , expr_c: 'null'  , expr_d: 'null'  , expr_e: 'nullnull;nullnull'        , expr_foo: null     },
                    { AccountId: null        , expr_a: 'qwerty', expr_b: ''      , expr_c: ''      , expr_d: ''      , expr_e: ';  '                      , expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid,
                        testspec_pass_thru('qwerty') expr_a,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_a: 'qwerty', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z2', expr_a: 'qwerty', expr_foo: 'aaa/z3' },
                    { AccountId: 'Account/z3', expr_a: 'qwerty', expr_foo: 'aaa/z5' },
                    { AccountId: null        , expr_a: 'qwerty', expr_foo: null     },
                    { AccountId: null        , expr_a: 'qwerty', expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid,
                        testspec_pass_thru(min(bar)) expr_b,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_b: 'bbb/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z2', expr_b: 'bbb/z3', expr_foo: 'aaa/z3' },
                    { AccountId: 'Account/z3', expr_b: 'bbb/z5', expr_foo: 'aaa/z5' },
                    { AccountId: null        , expr_b: null    , expr_foo: null     },
                    { AccountId: null        , expr_b: ''      , expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid,
                        testspec_pass_thru(
                            min(
                                testspec_string_concat(bar)
                            )
                        ) expr_c,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_c: 'bbb/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z2', expr_c: 'bbb/z3', expr_foo: 'aaa/z3' },
                    { AccountId: 'Account/z3', expr_c: 'bbb/z5', expr_foo: 'aaa/z5' },
                    { AccountId: null        , expr_c: 'null'  , expr_foo: null     },
                    { AccountId: null        , expr_c: ''      , expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid,
                        testspec_pass_thru(
                            min(
                                testspec_pass_thru(testspec_string_concat(bar))
                            )
                        ) expr_d,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_d: 'bbb/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z2', expr_d: 'bbb/z3', expr_foo: 'aaa/z3' },
                    { AccountId: 'Account/z3', expr_d: 'bbb/z5', expr_foo: 'aaa/z5' },
                    { AccountId: null        , expr_d: 'null'  , expr_foo: null     },
                    { AccountId: null        , expr_d: ''      , expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid,
                        testspec_pass_thru(
                            min(
                                concat(
                                    testspec_pass_thru(testspec_string_twice(bar)),
                                    ';',
                                    testspec_pass_thru(testspec_string_twice(baz))
                                )
                            )
                        ) expr_e,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_e: 'bbb/z1bbb/z1;ccc/z1ccc/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z2', expr_e: 'bbb/z3bbb/z3;ccc/z3ccc/z3', expr_foo: 'aaa/z3' },
                    { AccountId: 'Account/z3', expr_e: 'bbb/z5bbb/z5;ccc/z5ccc/z5', expr_foo: 'aaa/z5' },
                    { AccountId: null        , expr_e: 'nullnull;nullnull'        , expr_foo: null     },
                    { AccountId: null        , expr_e: ';  '                      , expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }
        }
    });

    it("Nested function call: aggregate (2)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const zzz = 1;
                const result = await soql`
                    select
                        accountid,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    having
                        testspec_pass_thru('qwerty') = 'qwerty'
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z2', expr_foo: 'aaa/z3' },
                    { AccountId: 'Account/z3', expr_foo: 'aaa/z5' },
                    { AccountId: null        , expr_foo: null     },
                    { AccountId: null        , expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    having
                        testspec_pass_thru(min(bar)) = 'bbb/z1' or
                        testspec_pass_thru(min(bar)) = 'bbb/z5'
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z3', expr_foo: 'aaa/z5' },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    having
                        testspec_pass_thru(
                            min(
                                testspec_string_concat(bar)
                            )
                        ) = 'bbb/z1' or
                        testspec_pass_thru(
                            min(
                                testspec_string_concat(bar)
                            )
                        ) = 'bbb/z5'
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z3', expr_foo: 'aaa/z5' },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    having
                        testspec_pass_thru(
                            min(
                                testspec_pass_thru(testspec_string_concat(bar))
                            )
                        ) = 'bbb/z1' or
                        testspec_pass_thru(
                            min(
                                testspec_pass_thru(testspec_string_concat(bar))
                            )
                        ) = 'bbb/z5'
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z3', expr_foo: 'aaa/z5' },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    having
                        testspec_pass_thru(
                            min(
                                concat(
                                    testspec_pass_thru(testspec_string_twice(bar)),
                                    ';',
                                    testspec_pass_thru(testspec_string_twice(baz))
                                )
                            )
                        ) = 'bbb/z1bbb/z1;ccc/z1ccc/z1' or
                        testspec_pass_thru(
                            min(
                                concat(
                                    testspec_pass_thru(testspec_string_twice(bar)),
                                    ';',
                                    testspec_pass_thru(testspec_string_twice(baz))
                                )
                            )
                        ) = 'bbb/z5bbb/z5;ccc/z5ccc/z5'
                    `;
                const expects = [
                    { AccountId: 'Account/z1', expr_foo: 'aaa/z1' },
                    { AccountId: 'Account/z3', expr_foo: 'aaa/z5' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });

    it("Nested function call: aggregate (3)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        concat(accountid, '!') expr_a,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    `;
                const expects = [
                    { expr_a: 'Account/z1!', expr_foo: 'aaa/z1' },
                    { expr_a: 'Account/z2!', expr_foo: 'aaa/z3' },
                    { expr_a: 'Account/z3!', expr_foo: 'aaa/z5' },
                    { expr_a: '!'          , expr_foo: null     },
                    { expr_a: '!'          , expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }

            {
                try {
                    const result = await soql`
                        select
                            concat(bar, '!') expr_a,
                            min(foo) expr_foo
                        from contact
                        group by accountid
                        `;
                    expect(1).toEqual(0);
                } catch (e) {
                    expect(1).toEqual(1);
                }
            }

            {
                const result = await soql`
                    select
                        concat(accountid, '!', max(bar)) expr_a,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    `;
                const expects = [
                    { expr_a: 'Account/z1!bbb/z2', expr_foo: 'aaa/z1' },
                    { expr_a: 'Account/z2!bbb/z4', expr_foo: 'aaa/z3' },
                    { expr_a: 'Account/z3!bbb/z7', expr_foo: 'aaa/z5' },
                    { expr_a: '!'          , expr_foo: null     },
                    { expr_a: '!'          , expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        testspec_pass_thru(max(bar)) expr_a,
                        min(foo) expr_foo
                    from contact
                    group by accountid
                    `;
                const expects = [
                    { expr_a: 'bbb/z2', expr_foo: 'aaa/z1' },
                    { expr_a: 'bbb/z4', expr_foo: 'aaa/z3' },
                    { expr_a: 'bbb/z7', expr_foo: 'aaa/z5' },
                    { expr_a: null    , expr_foo: null     },
                    { expr_a: ''      , expr_foo: ''       },
                ];
                expect(result).toEqual(expects);
            }
        }
    });
});
