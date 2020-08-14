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


describe("operators-1", function() {
    it("Operator '=' (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo='aaa/z3'`;
                const expects = [
                    { Foo: 'aaa/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo=${'aaa/z3'}`;
                const expects = [
                    { Foo: 'aaa/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo=null`;
                const expects = [
                    { Foo: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo=null`;
                const expects = [
                    { Foo: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge=-1`;
                const expects = [
                    { Corge: -1 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge=${-1}`;
                const expects = [
                    { Corge: -1 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge=0`;
                const expects = [
                    { Corge: 0 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge=${0}`;
                const expects = [
                    { Corge: 0 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge=null`;
                const expects = [
                    { Corge: null },
                    { Corge: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge=${null}`;
                const expects = [
                    { Corge: null },
                    { Corge: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux=true`;
                const expects = [
                    { Quux: true },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux=${true}`;
                const expects = [
                    { Quux: true },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux=false`;
                const expects = [
                    { Quux: false },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux=${false}`;
                const expects = [
                    { Quux: false },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux=null`;
                const expects = [
                    { Quux: null },
                    { Quux: null },
                    { Quux: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux=${null}`;
                const expects = [
                    { Quux: null },
                    { Quux: null },
                    { Quux: null },
                ];
                expect(result).toEqual(expects);
            }

            // TODO: date, datetime
        }
    });

    it("Operator '!=' (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo!='aaa/z3'`;
                const expects = [
                    { Foo: 'aaa/z1' },
                    { Foo: 'aaa/z2' },
                    { Foo: null },
                    { Foo: '' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo!=${'aaa/z3'}`;
                const expects = [
                    { Foo: 'aaa/z1' },
                    { Foo: 'aaa/z2' },
                    { Foo: null },
                    { Foo: '' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        foo
                    from contact
                    where foo!=null`;
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
                    where foo!=${null}`;
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
                        corge
                    from contact
                    where corge!=-1`;
                const expects = [
                    { Corge: 0 },
                    { Corge: 1 },
                    { Corge: null },
                    { Corge: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge!=${-1}`;
                const expects = [
                    { Corge: 0 },
                    { Corge: 1 },
                    { Corge: null },
                    { Corge: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge!=0`;
                const expects = [
                    { Corge: -1 },
                    { Corge: 1 },
                    { Corge: null },
                    { Corge: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge!=${0}`;
                const expects = [
                    { Corge: -1 },
                    { Corge: 1 },
                    { Corge: null },
                    { Corge: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge!=null`;
                const expects = [
                    { Corge: -1 },
                    { Corge: 0 },
                    { Corge: 1 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        corge
                    from contact
                    where corge!=${null}`;
                const expects = [
                    { Corge: -1 },
                    { Corge: 0 },
                    { Corge: 1 },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux!=true`;
                const expects = [
                    { Quux: false },
                    { Quux: null },
                    { Quux: null },
                    { Quux: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux!=${true}`;
                const expects = [
                    { Quux: false },
                    { Quux: null },
                    { Quux: null },
                    { Quux: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux!=false`;
                const expects = [
                    { Quux: true },
                    { Quux: null },
                    { Quux: null },
                    { Quux: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux!=${false}`;
                const expects = [
                    { Quux: true },
                    { Quux: null },
                    { Quux: null },
                    { Quux: null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux!=null`;
                const expects = [
                    { Quux: false },
                    { Quux: true },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        quux
                    from contact
                    where quux!=${null}`;
                const expects = [
                    { Quux: false },
                    { Quux: true },
                ];
                expect(result).toEqual(expects);
            }

            // TODO: date, datetime
        }
    });
});
