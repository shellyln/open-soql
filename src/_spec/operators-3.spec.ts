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
                    Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , false    ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   , Account/z1
                    Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , true     ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z1
                    Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" ,          ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" , "Account/z2"
                    Contact/z4 ,          ,          ,          ,          ,          ,         ,              ,                        ,
                    Contact/z5 ,       "" ,       "" ,      " " ,       "" ,          ,         ,              ,                        ,
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


describe("operators-3", function() {
    it("Operator 'like' (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo like 'aa/%'`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo like '_a/%'`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo like '%a/%'`;
                const expects = [
                    { Foo: 'aaa/z1' },
                    { Foo: 'aaa/z2' },
                    { Foo: 'aaa/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo like '_aa/%'`;
                const expects = [
                    { Foo: 'aaa/z1' },
                    { Foo: 'aaa/z2' },
                    { Foo: 'aaa/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo like 'aaa/_'`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo like 'aaa/z_'`;
                const expects = [
                    { Foo: 'aaa/z1' },
                    { Foo: 'aaa/z2' },
                    { Foo: 'aaa/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo like 'aaa/%'`;
                const expects = [
                    { Foo: 'aaa/z1' },
                    { Foo: 'aaa/z2' },
                    { Foo: 'aaa/z3' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Operator 'not like' (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo not like 'aa/%'`;
                const expects = [
                    { Foo: 'aaa/z1' },
                    { Foo: 'aaa/z2' },
                    { Foo: 'aaa/z3' },
                    { Foo: '' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo not like '_a/%'`;
                const expects = [
                    { Foo: 'aaa/z1' },
                    { Foo: 'aaa/z2' },
                    { Foo: 'aaa/z3' },
                    { Foo: '' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo not like '%a/%'`;
                const expects = [
                    { Foo: '' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo not like '_aa/%'`;
                const expects = [
                    { Foo: '' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo not like 'aaa/_'`;
                const expects = [
                    { Foo: 'aaa/z1' },
                    { Foo: 'aaa/z2' },
                    { Foo: 'aaa/z3' },
                    { Foo: '' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo not like 'aaa/z_'`;
                const expects = [
                    { Foo: '' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo not like 'aaa/%'`;
                const expects = [
                    { Foo: '' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Operator 'in' (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        id
                    from account
                    where id in (select accountid from contact)`;
                const expects = [
                    { Id: 'Account/z1' },
                    { Id: 'Account/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        id
                    from account
                    where id in (select accountid from contact where accountid != null)`;
                const expects = [
                    { Id: 'Account/z1' },
                    { Id: 'Account/z2' },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid
                    from contact
                    where accountid in (select whatid from event)`;
                const expects = [
                    { AccountId: 'Account/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        accountid
                    from contact
                    where accountid in (select whatid from event where whatid != null)`;
                const expects = [
                    { AccountId: 'Account/z2' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Operator 'not in' (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        id
                    from account
                    where id not in (select accountid from contact)`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        id
                    from account
                    where id not in (select accountid from contact where accountid != null)`;
                const expects = [
                    { Id: 'Account/z3' },
                    { Id: 'Account/z4' },
                    { Id: 'Account/z5' },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        accountid
                    from contact
                    where accountid not in (select whatid from event)`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        accountid
                    from contact
                    where accountid not in (select whatid from event where whatid != null)`;
                const expects = [
                    { AccountId: 'Account/z1' },
                    { AccountId: 'Account/z1' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });
});
