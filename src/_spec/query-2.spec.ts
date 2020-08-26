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
                    Id         , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                 , AccountId
                    Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   , Account/z1
                    Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z1
                    Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" , "Account/z2"
                    Contact/z4 ,          ,          ,          ,          ,          ,         ,              ,                        ,
                    Contact/z5 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                        ,
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


describe("query-2", function() {
    it("Relational query (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        id, name,
                        (select id, name, amount from opportunities)
                    from account`;
                const expects = [
                    { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] },
                    { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                    { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] },
                    { Id: 'Account/z3', Name: 'fff/z3',
                    Opportunities: [] },
                    { Id: 'Account/z4', Name: null,
                    Opportunities: [] },
                    { Id: 'Account/z5', Name: '',
                    Opportunities: [] },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities)
                    from contact, account`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                    { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                    Account: null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        contact.account.id, contact.account.name,
                        (select id, name, amount from contact.account.opportunities)
                    from contact, account`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                    { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                    Account: null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        con.account.id, con.account.name,
                        (select id, name, amount from con.account.opportunities)
                    from contact con, account acc`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                    { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                    Account: null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        acc.id, acc.name,
                        (select id, name, amount from acc.opportunities)
                    from contact con, account acc`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
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
    });


    it("Relational query with condition (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities where name='hhh/z2' or name='')
                    from contact, account
                    where (foo='aaa/z1' or foo='aaa/z2' or foo='aaa/z3' or foo='') and (account.name='fff/z2')`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: null },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: null },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities where name='hhh/z2' or name='')
                    from contact, account
                    where (foo=${'aaa/z1'} or foo=${'aaa/z2'} or foo=${'aaa/z3'} or foo=${''}) and (account.name=${'fff/z2'})`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: null },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: null },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        contact.account.id, contact.account.name,
                        (select id, name, amount from contact.account.opportunities where name='hhh/z2' or name='')
                    from contact, contact.account
                    where (foo='aaa/z1' or foo='aaa/z2' or foo='aaa/z3' or foo='') and (contact.account.name='fff/z2')`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: null },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: null },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        acc.id, acc.name,
                        (select id, name, amount from acc.opportunities where name='hhh/z2' or name='')
                    from contact con, account acc
                    where (foo='aaa/z1' or foo='aaa/z2' or foo='aaa/z3' or foo='') and (acc.name='fff/z2')`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: null },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: null },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        con.account.id, con.account.name,
                        (select id, name, amount from con.account.opportunities where name='hhh/z2' or name='')
                    from contact con, con.account acc
                    where (foo='aaa/z1' or foo='aaa/z2' or foo='aaa/z3' or foo='') and (con.account.name='fff/z2')`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: null },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: null },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Relational query with limit and ofset (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities where name='hhh/z2' or name='')
                    from contact, account
                    where (foo='aaa/z1' or foo='aaa/z2' or foo='aaa/z3' or foo='') and (account.name='fff/z2')
                    limit 2 offset 0`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: null },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities where name='hhh/z2' or name='')
                    from contact, account
                    where (foo='aaa/z1' or foo='aaa/z2' or foo='aaa/z3' or foo='') and (account.name='fff/z2')
                    limit 2 offset 1`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: null },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities where name='hhh/z2' or name='')
                    from contact, account
                    where (foo='aaa/z1' or foo='aaa/z2' or foo='aaa/z3' or foo='') and (account.name='fff/z2')
                    limit 2 offset 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities where name='hhh/z2' or name='')
                    from contact, account
                    where (foo='aaa/z1' or foo='aaa/z2' or foo='aaa/z3' or foo='') and (account.name='fff/z2')
                    limit 2 offset 3`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities where name='hhh/z2' or name='')
                    from contact, account
                    where (foo='aaa/z1' or foo='aaa/z2' or foo='aaa/z3' or foo='') and (account.name='fff/z2')
                    limit 2 offset 4`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Relational query with limit and ofset (2); + order by", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;
            const expectsA = [
                { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                Account: null },
                { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                Account: null },
                { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                Account: { Id: 'Account/z1', Name: 'fff/z1',
                Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                Account: { Id: 'Account/z1', Name: 'fff/z1',
                Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                Account: { Id: 'Account/z2', Name: 'fff/z2',
                Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 },
                                { Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 }] }},
            ];

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        contact.account.id, contact.account.name,
                        (select
                            id, name,
                            contact.account.opportunities.amount
                        from contact.account.opportunities
                        order by contact.account.opportunities.name)
                    from contact, account
                    order by contact.account.name, id`;
                expect(result).toEqual(expectsA);
            }
            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select
                            id, name,
                            account.opportunities.amount
                        from account.opportunities
                        order by account.opportunities.name)
                    from contact, account
                    order by account.name, id`;
                expect(result).toEqual(expectsA);
            }
            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select
                            id, name,
                            opportunities.amount
                        from account.opportunities
                        order by opportunities.name)
                    from contact, account
                    order by account.name, id`;
                expect(result).toEqual(expectsA);
            }
            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select
                            id, name,
                            amount
                        from account.opportunities
                        order by name)
                    from contact, account
                    order by account.name, id`;
                expect(result).toEqual(expectsA);
            }
            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select
                            id, name,
                            amount
                        from account.opportunities
                        order by name)
                    from contact, contact.account
                    order by account.name, id`;
                expect(result).toEqual(expectsA);
            }
            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        acc.id, acc.name,
                        (select
                            id, name,
                            opp.amount
                        from acc.opportunities opp
                        order by opp.name)
                    from contact con, account acc
                    order by acc.name, id`;
                expect(result).toEqual(expectsA);
            }
            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        acc.id, acc.name,
                        (select
                            id, name,
                            opp.amount
                        from acc.opportunities opp
                        order by opp.name)
                    from contact con, con.account acc
                    order by acc.name, id`;
                expect(result).toEqual(expectsA);
            }
        }
    });


    it("Relational query with limit and ofset (2); + order by asc", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities order by name asc)
                    from contact, account
                    order by account.name asc, id asc`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                    Account: null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 },
                                    { Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 }] }},
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Relational query with limit and ofset (2); + order by desc", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        id, foo, bar, baz,
                        account.id, account.name,
                        (select id, name, amount from account.opportunities order by name desc)
                    from contact, account
                    order by account.name desc, id desc`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', Name: 'fff/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                    { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 },
                                    { Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 }] }},
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', Name: 'fff/z1',
                    Opportunities: [{ Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 },
                                    { Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 }] }},
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                    Account: null },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Relational query with function call", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        id cid, testspec_string_concat(foo, bar) foobar, testspec_pass_thru(2020-12-12) p1, baz,
                        account.id, testspec_string_concat(account.name, ';', acc.address) name_addr,
                        (select id, name, testspec_twice(amount) amount2 from account.opportunities)
                    from contact, account acc`;
                const expects = [
                    { Id: 'Contact/z1',
                    foobar: 'aaa/z1bbb/z1',
                    p1: '2020-12-12',
                    Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', name_addr: 'fff/z1;ggg/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', amount2: 1000 * 2 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', amount2: 2000 * 2 }] }},
                    { Id: 'Contact/z2',
                    foobar: 'aaa/z2bbb/z2',
                    p1: '2020-12-12',
                    Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', name_addr: 'fff/z1;ggg/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', amount2: 1000 * 2 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', amount2: 2000 * 2 }] }},
                    { Id: 'Contact/z3',
                    foobar: 'aaa/z3bbb/z3',
                    p1: '2020-12-12',
                    Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', name_addr: 'fff/z2;ggg/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', amount2: 3000 * 2 },
                                    { Id: 'Opportunity/z5', Name:       '', amount2:    0 * 2 }] }},
                    { Id: 'Contact/z4',
                    foobar: 'nullnull',
                    p1: '2020-12-12',
                    Baz:     null,
                    Account: null },
                    { Id: 'Contact/z5',
                    foobar:       '',
                    p1: '2020-12-12',
                    Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id cid, testspec_string_concat(foo, bar) foobar, testspec_pass_thru(2020-12-12) p1, baz,
                        account.id, testspec_string_concat(account.name, ';', acc.address) name_addr,
                        (select id, name, testspec_twice(amount) amount2 from account.opportunities)
                    from contact, account acc
                    order by id desc`;
                const expects = [
                    { Id: 'Contact/z5',
                    foobar:       '',
                    p1: '2020-12-12',
                    Baz:      ' ',
                    Account: null },
                    { Id: 'Contact/z4',
                    foobar: 'nullnull',
                    p1: '2020-12-12',
                    Baz:     null,
                    Account: null },
                    { Id: 'Contact/z3',
                    foobar: 'aaa/z3bbb/z3',
                    p1: '2020-12-12',
                    Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', name_addr: 'fff/z2;ggg/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', amount2: 3000 * 2 },
                                    { Id: 'Opportunity/z5', Name:       '', amount2:    0 * 2 }] }},
                    { Id: 'Contact/z2',
                    foobar: 'aaa/z2bbb/z2',
                    p1: '2020-12-12',
                    Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', name_addr: 'fff/z1;ggg/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', amount2: 1000 * 2 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', amount2: 2000 * 2 }] }},
                    { Id: 'Contact/z1',
                    foobar: 'aaa/z1bbb/z1',
                    p1: '2020-12-12',
                    Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', name_addr: 'fff/z1;ggg/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', amount2: 1000 * 2 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', amount2: 2000 * 2 }] }},
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id cid, testspec_string_concat(foo, bar) foobar, testspec_pass_thru(2020-12-12) p1, baz,
                        account.id, testspec_string_concat(account.name, ';', acc.address) name_addr,
                        (select id, name, testspec_twice(amount) amount2 from account.opportunities)
                    from contact, account acc
                    order by cid desc`;
                const expects = [
                    { Id: 'Contact/z5',
                    foobar:       '',
                    p1: '2020-12-12',
                    Baz:      ' ',
                    Account: null },
                    { Id: 'Contact/z4',
                    foobar: 'nullnull',
                    p1: '2020-12-12',
                    Baz:     null,
                    Account: null },
                    { Id: 'Contact/z3',
                    foobar: 'aaa/z3bbb/z3',
                    p1: '2020-12-12',
                    Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', name_addr: 'fff/z2;ggg/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', amount2: 3000 * 2 },
                                    { Id: 'Opportunity/z5', Name:       '', amount2:    0 * 2 }] }},
                    { Id: 'Contact/z2',
                    foobar: 'aaa/z2bbb/z2',
                    p1: '2020-12-12',
                    Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', name_addr: 'fff/z1;ggg/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', amount2: 1000 * 2 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', amount2: 2000 * 2 }] }},
                    { Id: 'Contact/z1',
                    foobar: 'aaa/z1bbb/z1',
                    p1: '2020-12-12',
                    Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', name_addr: 'fff/z1;ggg/z1',
                    Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', amount2: 1000 * 2 },
                                    { Id: 'Opportunity/z2', Name: 'hhh/z2', amount2: 2000 * 2 }] }},
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id cid, testspec_string_concat(foo, bar) foobar, testspec_pass_thru(2020-12-12) p1, baz,
                        account.id, testspec_string_concat(account.name, ';', acc.address) name_addr,
                        (select id, name, testspec_twice(amount) amount2 from account.opportunities order by id desc)
                    from contact, account acc
                    order by foobar desc`;
                const expects = [
                    { Id: 'Contact/z4',
                    foobar: 'nullnull',
                    p1: '2020-12-12',
                    Baz:     null,
                    Account: null },
                    { Id: 'Contact/z3',
                    foobar: 'aaa/z3bbb/z3',
                    p1: '2020-12-12',
                    Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', name_addr: 'fff/z2;ggg/z2',
                    Opportunities: [{ Id: 'Opportunity/z5', Name:       '', amount2:    0 * 2 },
                                    { Id: 'Opportunity/z3', Name: 'hhh/z3', amount2: 3000 * 2 }] }},
                    { Id: 'Contact/z2',
                    foobar: 'aaa/z2bbb/z2',
                    p1: '2020-12-12',
                    Baz: 'ccc/z2',
                    Account: { Id: 'Account/z1', name_addr: 'fff/z1;ggg/z1',
                    Opportunities: [{ Id: 'Opportunity/z2', Name: 'hhh/z2', amount2: 2000 * 2 },
                                    { Id: 'Opportunity/z1', Name: 'hhh/z1', amount2: 1000 * 2 }] }},
                    { Id: 'Contact/z1',
                    foobar: 'aaa/z1bbb/z1',
                    p1: '2020-12-12',
                    Baz: 'ccc/z1',
                    Account: { Id: 'Account/z1', name_addr: 'fff/z1;ggg/z1',
                    Opportunities: [{ Id: 'Opportunity/z2', Name: 'hhh/z2', amount2: 2000 * 2 },
                                    { Id: 'Opportunity/z1', Name: 'hhh/z1', amount2: 1000 * 2 }] }},
                    { Id: 'Contact/z5',
                    foobar:       '',
                    p1: '2020-12-12',
                    Baz:      ' ',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id cid, testspec_string_concat(foo, bar) foobar, testspec_pass_thru(2020-12-12) p1, baz,
                        account.id, testspec_string_concat(account.name, ';', acc.address) name_addr,
                        (select id, name, testspec_twice(amount) amount2 from account.opportunities)
                    from contact, account acc
                    where (foobar='aaa/z1bbb/z1' or foobar='aaa/z3bbb/z3') and acc.name_addr='fff/z2;ggg/z2'`;
                const expects = [
                    { Id: 'Contact/z1',
                    foobar: 'aaa/z1bbb/z1',
                    p1: '2020-12-12',
                    Baz: 'ccc/z1',
                    Account: null },
                    { Id: 'Contact/z3',
                    foobar: 'aaa/z3bbb/z3',
                    p1: '2020-12-12',
                    Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', name_addr: 'fff/z2;ggg/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', amount2: 3000 * 2 },
                                    { Id: 'Opportunity/z5', Name:       '', amount2:    0 * 2 }] }},
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id cid, testspec_string_concat(foo, bar) foobar, testspec_pass_thru(2020-12-12) p1, baz,
                        account.id, testspec_string_concat(account.name, ';', acc.address) name_addr,
                        (select id, name, testspec_twice(amount) amount2 from account.opportunities)
                    from contact, account acc
                    where (foobar='aaa/z1bbb/z1' or foobar='aaa/z3bbb/z3') and acc.name_addr='fff/z2;ggg/z2'
                    order by acc.name_addr desc`;
                const expects = [
                    { Id: 'Contact/z3',
                    foobar: 'aaa/z3bbb/z3',
                    p1: '2020-12-12',
                    Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', name_addr: 'fff/z2;ggg/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', amount2: 3000 * 2 },
                                    { Id: 'Opportunity/z5', Name:       '', amount2:    0 * 2 }] }},
                    { Id: 'Contact/z1',
                    foobar: 'aaa/z1bbb/z1',
                    p1: '2020-12-12',
                    Baz: 'ccc/z1',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        id cid, testspec_string_concat(foo, bar) foobar, testspec_pass_thru(2020-12-12) p1, baz,
                        account.id, testspec_string_concat(account.name, ';', acc.address) name_addr,
                        (select id, name, testspec_twice(amount) amount2 from account.opportunities)
                    from contact, account acc
                    where (foobar='aaa/z1bbb/z1' or foobar='aaa/z3bbb/z3') and acc.name_addr='fff/z2;ggg/z2'
                    order by cid desc, acc.name_addr desc`;
                const expects = [
                    { Id: 'Contact/z3',
                    foobar: 'aaa/z3bbb/z3',
                    p1: '2020-12-12',
                    Baz: 'ccc/z3',
                    Account: { Id: 'Account/z2', name_addr: 'fff/z2;ggg/z2',
                    Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', amount2: 3000 * 2 },
                                    { Id: 'Opportunity/z5', Name:       '', amount2:    0 * 2 }] }},
                    { Id: 'Contact/z1',
                    foobar: 'aaa/z1bbb/z1',
                    p1: '2020-12-12',
                    Baz: 'ccc/z1',
                    Account: null },
                ];
                expect(result).toEqual(expects);
            }
        }
    });
});
