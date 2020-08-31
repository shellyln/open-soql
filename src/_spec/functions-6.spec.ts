// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { build }                    from '../builder';
import { setDefaultStaticResolverConfig,
         staticCsvResolverBuilder } from '../resolvers';
import { resolverConfigs }          from './helpers/config';



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
                    Id         , Foo      , Bar      , Baz      , Qux , Quux  ,   Corge , Grault       , Garply                 , AccountId
                    Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   ,     , false ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   , Account/z1
                    Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   ,     , true  ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z1
                    Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" ,     ,       ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" , "Account/z2"
                    Contact/z4 ,          ,          ,          ,     ,       ,         ,              ,                        ,
                    Contact/z5 ,       "" ,       "" ,      " " ,     ,       ,         ,              ,                        ,
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


describe("functions-6", function() {


    it("Functions: week_in_year (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const offset = new Date().getTimezoneOffset();
                const result = await soql`
                    select
                        week_in_year(grault) d_utc,
                        week_in_year(garply) dt_utc
                    from contact
                    `;
                const expects = [
                    { d_utc:   53, dt_utc:   53 },
                    { d_utc:    1, dt_utc:    1 },
                    { d_utc:    1, dt_utc:    1 },
                    { d_utc: null, dt_utc: null },
                    { d_utc: null, dt_utc: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        week_in_year(2019-12-01) d_utc,
                        week_in_year(2019-12-01T00:00:00Z) dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 48, dt_utc: 48 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-01-01') d_utc,
                        week_in_year('2020-01-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 1, dt_utc: 1 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-02-01') d_utc,
                        week_in_year('2020-02-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 5, dt_utc: 5 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-03-01') d_utc,
                        week_in_year('2020-03-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 9, dt_utc: 9 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-04-01') d_utc,
                        week_in_year('2020-04-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 14, dt_utc: 14 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-05-01') d_utc,
                        week_in_year('2020-05-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 18, dt_utc: 18 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-06-01') d_utc,
                        week_in_year('2020-06-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 22, dt_utc: 22 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-07-01') d_utc,
                        week_in_year('2020-07-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 27, dt_utc: 27 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-08-01') d_utc,
                        week_in_year('2020-08-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 31, dt_utc: 31 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-09-01') d_utc,
                        week_in_year('2020-09-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 35, dt_utc: 35 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-10-01') d_utc,
                        week_in_year('2020-10-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 40, dt_utc: 40 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-11-01') d_utc,
                        week_in_year('2020-11-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 44, dt_utc: 44 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-12-01') d_utc,
                        week_in_year('2020-12-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 48, dt_utc: 48 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2021-01-01') d_utc,
                        week_in_year('2021-01-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 1, dt_utc: 1 },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        week_in_year('2020-02-04') d_utc,
                        week_in_year('2020-02-04T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 5, dt_utc: 5 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-02-05') d_utc,
                        week_in_year('2020-02-05T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 6, dt_utc: 6 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-03-03') d_utc,
                        week_in_year('2020-03-03T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 9, dt_utc: 9 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2020-03-04') d_utc,
                        week_in_year('2020-03-04T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 10, dt_utc: 10 },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        week_in_year('2021-02-04') d_utc,
                        week_in_year('2021-02-04T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 5, dt_utc: 5 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2021-02-05') d_utc,
                        week_in_year('2021-02-05T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 6, dt_utc: 6 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2021-03-04') d_utc,
                        week_in_year('2021-03-04T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 9, dt_utc: 9 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        week_in_year('2021-03-05') d_utc,
                        week_in_year('2021-03-05T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 10, dt_utc: 10 },
                ];
                expect(result).toEqual(expects);
            }
        }
    });
});
