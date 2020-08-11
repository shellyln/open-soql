
import { parse }                    from '../lib/parser';
import { prepareQuery,
         prepareBuilderInfo }       from '../lib/prepare';
import { getObjectValue }           from '../lib/util';
import { QueryBuilderInfoInternal } from '../types';
import { build }                    from '../builder';
import { staticJsonResolverBuilder,
         staticCsvResolverBuilder,
         passThroughResolverBuilder } from '../resolvers';



const commands1 = build({
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
        const { soql, insert, update, remove, transaction } = commands1;

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
    });


    it("Relational query with condition (1)", async function() {
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
    });


    it("Relational query with limit and ofset (1)", async function() {
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
    });


    it("Relational query with limit and ofset (2); + order by", async function() {
        const { soql, insert, update, remove, transaction } = commands1;

        {
            const result = await soql`
                select
                    id, foo, bar, baz,
                    contact.account.id, contact.account.name,
                    (select id, name, amount from contact.account.opportunities order by name)
                from contact, account
                order by contact.account.name, id`;
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

        // {
        //     // BUG: Error: Resolver 'opportunities' is not found.
        //     //      (compiler.ts: 557)
        //     const result = await soql`
        //         select
        //             id, foo, bar, baz,
        //             account.id, account.name,
        //             (select id, opportunities.name, /*account.*/opportunities.amount from account.opportunities order by /*account.*/opportunities.name)
        //         from contact, account
        //         order by account.name, id`;
        //     const expects = [
        //         { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
        //           Account: null },
        //         { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
        //           Account: null },
        //         { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
        //           Account: { Id: 'Account/z1', Name: 'fff/z1',
        //           Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
        //                           { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
        //         { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
        //           Account: { Id: 'Account/z1', Name: 'fff/z1',
        //           Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
        //                           { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
        //         { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
        //           Account: { Id: 'Account/z2', Name: 'fff/z2',
        //           Opportunities: [{ Id: 'Opportunity/z5', Name:       '', Amount:    0 },
        //                           { Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 }] }},
        //     ];
        //     expect(result).toEqual(expects);
        // }

        {
            const result = await soql`
                select
                    id, foo, bar, baz,
                    acc.id, acc.name,
                    (select id, name, opp.amount from acc.opportunities opp order by opp.name)
                from contact con, account acc
                order by acc.name, id`;
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
    });


    it("Relational query with limit and ofset (2); + order by asc", async function() {
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
    });


    it("Relational query with limit and ofset (2); + order by desc", async function() {
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
    });
});
