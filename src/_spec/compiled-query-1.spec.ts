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



let postfix = 0;

const commands1 = build({
    functions: [{
        type: 'scalar',
        name: 'testspec_string_concat',
        fn: (ctx, args, records) => {
            return args.map(c => String(c)).join('');
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
    }, {
        type: 'aggregate',
        name: 'testspec_agg_pass_thru',
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
                    Id         , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                 , AccountId
                    Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   , Account/z1
                    Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z1
                    Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" , "Account/z2"
                    Contact/z4 ,          ,          ,          ,          ,          ,         ,              ,                        ,
                    Contact/z5 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                        ,
                `)
            ),
            Account: (fields, conditions, limit, offset, ctx) => {
                let data = [
                    { Id: 'Account/z1', Name: `fff/z1-${postfix}`, Address: `ggg/z1-${postfix}` },
                    { Id: 'Account/z2', Name: `fff/z2-${postfix}`, Address: `ggg/z2-${postfix}` },
                    { Id: 'Account/z3', Name: `fff/z3-${postfix}`, Address: `ggg/z3-${postfix}` },
                    { Id: 'Account/z4', Name: null    , Address: null     },
                    { Id: 'Account/z5', Name: ''      , Address: ''       },
                ];
                if (ctx.parent && ctx.parentType === 'detail') {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                    data = data.filter(x => x.Id === (ctx.parent as any)[ctx.foreignIdField!]);
                }
                return Promise.resolve(data);
            },
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


describe("compiled-query-1", function() {
    it("Compiled query (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { compile } = commands1;

            {
                const query = compile`
                    select
                        id, name,
                        (select id, name, amount from opportunities)
                    from account
                    where id > ${'Account/z1'}`;

                for (let i = 0; i < 5; i++) {
                    postfix = i;
                    const result = await query.execute<{ Id: string }>();
                    const expects = [
                        { Id: 'Account/z2', Name: `fff/z2-${postfix}`,
                        Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                        { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] },
                        { Id: 'Account/z3', Name: `fff/z3-${postfix}`,
                        Opportunities: [] },
                        { Id: 'Account/z4', Name: null,
                        Opportunities: [] },
                        { Id: 'Account/z5', Name: '',
                        Opportunities: [] },
                    ];
                    expect(result).toEqual(expects);
                }
            }

            {
                const query = compile`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities)
                    from contact, account
                    where id > ${'Contact/z1'}`;

                for (let i = 0; i < 5; i++) {
                    postfix = i;
                    const result = await query.execute<{ Id: string }>();
                    const expects = [
                        { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                        Account: { Id: 'Account/z1', Name: `fff/z1-${postfix}`,
                        Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                        { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                        { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                        Account: { Id: 'Account/z2', Name: `fff/z2-${postfix}`,
                        Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                        { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                        { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                        Account: null },
                        { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                        Account: null },
                    ];
                    expect(result).toEqual(expects);
                }
            }
        }
    });

    it("Compiled query (2)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { transaction } = commands1;

            await transaction(async ({ compile }) => {
                const query = compile`
                    select
                        id, name,
                        (select id, name, amount from opportunities)
                    from account
                    where id > ${'Account/z1'}`;

                for (let i = 0; i < 5; i++) {
                    postfix = i;
                    const result = await query.execute<{ Id: string }>();
                    const expects = [
                        { Id: 'Account/z2', Name: `fff/z2-${postfix}`,
                        Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                        { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] },
                        { Id: 'Account/z3', Name: `fff/z3-${postfix}`,
                        Opportunities: [] },
                        { Id: 'Account/z4', Name: null,
                        Opportunities: [] },
                        { Id: 'Account/z5', Name: '',
                        Opportunities: [] },
                    ];
                    expect(result).toEqual(expects);
                }
            });

            await transaction(async ({ compile }) => {
                const query = compile`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities)
                    from contact, account
                    where id > ${'Contact/z1'}`;

                for (let i = 0; i < 5; i++) {
                    postfix = i;
                    const result = await query.execute<{ Id: string }>();
                    const expects = [
                        { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                        Account: { Id: 'Account/z1', Name: `fff/z1-${postfix}`,
                        Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                        { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                        { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                        Account: { Id: 'Account/z2', Name: `fff/z2-${postfix}`,
                        Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                        { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                        { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                        Account: null },
                        { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                        Account: null },
                    ];
                    expect(result).toEqual(expects);
                }
            });
        }
    });

    it("Compiled query (3)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { compile } = commands1;

            {
                const query = compile`
                    select
                        id, name,
                        testspec_string_concat(name,:p1) expr_a,
                        testspec_pass_thru(:p2) expr_b,
                        (select id, name, amount from opportunities)
                    from account
                    where id = :aid`;

                for (let i = 0; i < 5; i++) {
                    postfix = i;
                    const result = await query.execute<{ Id: string }>({ aid: 'Account/z2', p1: `qwerty${i}`, p2: `asdfgh${i}` });
                    const expects = [
                        { Id: 'Account/z2', Name: `fff/z2-${postfix}`, expr_a: `fff/z2-${postfix}qwerty${i}`, expr_b: `asdfgh${i}`,
                        Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                        { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] },
                    ];
                    expect(result).toEqual(expects);
                }
            }
            {
                const query = compile`
                    select
                        id, name,
                        testspec_string_concat(name,:p1) expr_a,
                        testspec_pass_thru(:p2) expr_b,
                        (select id, name, amount from opportunities)
                    from account
                    where id = :aid and Name>''`;

                for (let i = 0; i < 5; i++) {
                    postfix = i;
                    const result = await query.execute<{ Id: string }>({ aid: 'Account/z2', p1: `qwerty${i}`, p2: `asdfgh${i}` });
                    const expects = [
                        { Id: 'Account/z2', Name: `fff/z2-${postfix}`, expr_a: `fff/z2-${postfix}qwerty${i}`, expr_b: `asdfgh${i}`,
                        Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                        { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] },
                    ];
                    expect(result).toEqual(expects);
                }
            }

            {
                const query = compile`
                    select
                        id, foo
                    from contact
                    where id = :cid`;

                for (let i = 1; i < 4; i++) {
                    postfix = i;
                    const result = await query.execute<{ Id: string }>({ cid: `Contact/z${i}` });
                    const expects = [
                        { Id: `Contact/z${i}`, Foo: `aaa/z${i}` },
                    ];
                    expect(result).toEqual(expects);
                }
            }

            {
                const query = compile`
                    select
                        id, foo
                    from contact
                    limit :limit offset :offset`;

                for (let i = 1; i < 4; i++) {
                    postfix = i;
                    const result = await query.execute<{ Id: string }>({ limit: 1, offset: i - 1 });
                    const expects = [
                        { Id: `Contact/z${i}`, Foo: `aaa/z${i}` },
                    ];
                    expect(result).toEqual(expects);
                }

                for (let i = 1; i < 3; i++) {
                    postfix = i;
                    const result = await query.execute<{ Id: string }>({ limit: 2, offset: i - 1 });
                    const expects = [
                        { Id: `Contact/z${i}`, Foo: `aaa/z${i}` },
                        { Id: `Contact/z${i + 1}`, Foo: `aaa/z${i + 1}` },
                    ];
                    expect(result).toEqual(expects);
                }
            }
        }
    });

    it("Compiled query (3)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { compile } = commands1;

            const query = compile`
                select
                    accountid, max(foo) Foo, count() expr_b,
                    testspec_agg_pass_thru(:qwerty) expr_c
                from contact
                group by accountid
                having count() = :cnt`;

            {
                const result = await query.execute({ cnt: 1, qwerty: 'yyy' });
                const expects = [
                    { AccountId: `Account/z2`, Foo: `aaa/z3`, expr_b: 1, expr_c: 'yyy' },
                    { AccountId: null        , Foo: null    , expr_b: 1, expr_c: 'yyy' },
                    { AccountId: null        , Foo: ``      , expr_b: 1, expr_c: 'yyy' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await query.execute({ cnt: 2, qwerty: 'zzz' });
                const expects = [
                    { AccountId: `Account/z1`, Foo: `aaa/z2`, expr_b: 2, expr_c: 'zzz' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });

    it("Compiled query (4)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { compile } = commands1;

            {
                const query = compile`
                    select
                        id, name,
                        testspec_string_concat(name,:p1) expr_a,
                        testspec_pass_thru(:p2) expr_b,
                        (select id, name, amount from opportunities)
                    from account
                    where id = :aid and Name>''`;

                try {
                    const result = await query.execute<{ Id: string }>({ aidd: 'Account/z2', p1: `qwerty${0}`, p2: `asdfgh${0}` });
                    expect(1).toEqual(0);
                } catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(e.message).toEqual("Parameter 'aid' is not found.");
                }

                try {
                    const result = await query.execute<{ Id: string }>({ aid: 'Account/z2', p1z: `qwerty${1}`, p2: `asdfgh${1}` });
                    expect(1).toEqual(0);
                } catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(e.message).toEqual("Parameter 'p1' is not found.");
                }

                try {
                    const result = await query.execute<{ Id: string }>({ aid: 'Account/z2', p1: `qwerty${2}`, p2z: `asdfgh${2}` });
                    expect(1).toEqual(0);
                } catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(e.message).toEqual("Parameter 'p2' is not found.");
                }
            }

            {
                const query = compile`
                    select
                        id, foo
                    from contact
                    limit :limit offset :offset`;

                try {
                    const result = await query.execute<{ Id: string }>({ limitt: 1, offset: 2 });
                    expect(1).toEqual(0);
                } catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(e.message).toEqual("Parameter 'limit' is not found.");
                }

                try {
                    const result = await query.execute<{ Id: string }>({ limit: 1, offsett: 2 });
                    expect(1).toEqual(0);
                } catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(e.message).toEqual("Parameter 'offset' is not found.");
                }
            }

            {
                const query = compile`
                    select
                        accountid, max(foo) Foo, count() expr_b,
                        testspec_agg_pass_thru(:qwerty) expr_c
                    from contact
                    group by accountid
                    having count() = :cnt`;

                try {
                    const result = await query.execute({ cntt: 1, qwerty: 'yyy' });
                    expect(1).toEqual(0);
                } catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(e.message).toEqual("Parameter 'cnt' is not found.");
                }

                try {
                    const result = await query.execute({ cnt: 1, qwertyy: 'yyy' });
                    expect(1).toEqual(0);
                } catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(e.message).toEqual("Parameter 'qwerty' is not found.");
                }
            }
        }
    });
});
