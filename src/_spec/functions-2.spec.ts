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


describe("functions-2", function() {
    it("Functions (1): calendar_month", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const offset = new Date().getTimezoneOffset();
                const result = await soql`
                    select
                        calendar_month(grault) d_utc,
                        calendar_month(garply) dt_utc
                    from contact
                    `;
                const expects = [
                    { d_utc:   12, dt_utc:   12 },
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
                        calendar_month('2019-12-01') d_utc,
                        calendar_month('2019-12-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 12, dt_utc: 12 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-01-01') d_utc,
                        calendar_month('2020-01-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 1, dt_utc: 1 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-02-01') d_utc,
                        calendar_month('2020-02-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2, dt_utc: 2 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-03-01') d_utc,
                        calendar_month('2020-03-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 3, dt_utc: 3 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-04-01') d_utc,
                        calendar_month('2020-04-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 4, dt_utc: 4 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-05-01') d_utc,
                        calendar_month('2020-05-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 5, dt_utc: 5 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-06-01') d_utc,
                        calendar_month('2020-06-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 6, dt_utc: 6 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-07-01') d_utc,
                        calendar_month('2020-07-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 7, dt_utc: 7 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-08-01') d_utc,
                        calendar_month('2020-08-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 8, dt_utc: 8 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-09-01') d_utc,
                        calendar_month('2020-09-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 9, dt_utc: 9 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-10-01') d_utc,
                        calendar_month('2020-10-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 10, dt_utc: 10 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-11-01') d_utc,
                        calendar_month('2020-11-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 11, dt_utc: 11 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2020-12-01') d_utc,
                        calendar_month('2020-12-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 12, dt_utc: 12 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_month('2021-01-01') d_utc,
                        calendar_month('2021-01-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 1, dt_utc: 1 },
                ];
                expect(result).toEqual(expects);
            }
        }
    });

    it("Functions (1): calendar_month", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const offset = new Date().getTimezoneOffset();
                const result = await soql`
                    select
                        calendar_quarter(grault) d_utc,
                        calendar_quarter(garply) dt_utc
                    from contact
                    `;
                const expects = [
                    { d_utc:    4, dt_utc:    4 },
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
                        calendar_quarter('2019-12-01') d_utc,
                        calendar_quarter('2019-12-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 4, dt_utc: 4 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-01-01') d_utc,
                        calendar_quarter('2020-01-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 1, dt_utc: 1 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-02-01') d_utc,
                        calendar_quarter('2020-02-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 1, dt_utc: 1 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-03-01') d_utc,
                        calendar_quarter('2020-03-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 1, dt_utc: 1 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-04-01') d_utc,
                        calendar_quarter('2020-04-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2, dt_utc: 2 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-05-01') d_utc,
                        calendar_quarter('2020-05-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2, dt_utc: 2 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-06-01') d_utc,
                        calendar_quarter('2020-06-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2, dt_utc: 2 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-07-01') d_utc,
                        calendar_quarter('2020-07-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 3, dt_utc: 3 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-08-01') d_utc,
                        calendar_quarter('2020-08-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 3, dt_utc: 3 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-09-01') d_utc,
                        calendar_quarter('2020-09-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 3, dt_utc: 3 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-10-01') d_utc,
                        calendar_quarter('2020-10-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 4, dt_utc: 4 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-11-01') d_utc,
                        calendar_quarter('2020-11-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 4, dt_utc: 4 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2020-12-01') d_utc,
                        calendar_quarter('2020-12-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 4, dt_utc: 4 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_quarter('2021-01-01') d_utc,
                        calendar_quarter('2021-01-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 1, dt_utc: 1 },
                ];
                expect(result).toEqual(expects);
            }
        }
    });

    it("Functions (1): calendar_year", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const offset = new Date().getTimezoneOffset();
                const result = await soql`
                    select
                        calendar_year(grault) d_utc,
                        calendar_year(garply) dt_utc
                    from contact
                    `;
                const expects = [
                    { d_utc: 2019, dt_utc: 2019 },
                    { d_utc: 2020, dt_utc: 2020 },
                    { d_utc: 2020, dt_utc: 2020 },
                    { d_utc: null, dt_utc: null },
                    { d_utc: null, dt_utc: null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`
                    select
                        calendar_year('2019-12-01') d_utc,
                        calendar_year('2019-12-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2019, dt_utc: 2019 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-01-01') d_utc,
                        calendar_year('2020-01-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-02-01') d_utc,
                        calendar_year('2020-02-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-03-01') d_utc,
                        calendar_year('2020-03-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-04-01') d_utc,
                        calendar_year('2020-04-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-05-01') d_utc,
                        calendar_year('2020-05-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-06-01') d_utc,
                        calendar_year('2020-06-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-07-01') d_utc,
                        calendar_year('2020-07-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-08-01') d_utc,
                        calendar_year('2020-08-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-09-01') d_utc,
                        calendar_year('2020-09-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-10-01') d_utc,
                        calendar_year('2020-10-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-11-01') d_utc,
                        calendar_year('2020-11-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2020-12-01') d_utc,
                        calendar_year('2020-12-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2020, dt_utc: 2020 },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        calendar_year('2021-01-01') d_utc,
                        calendar_year('2021-01-01T00:00:00Z') dt_utc
                    from contact where id='Contact/z1'`;
                const expects = [
                    { d_utc: 2021, dt_utc: 2021 },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    /*
    it("Functions (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        day_in_month()        expr_,
                        day_in_month_lc()     expr_,
                        day_in_week()         expr_,
                        day_in_week_lc()      expr_,
                        day_in_year()         expr_,
                        day_in_year_lc()      expr_,
                        day_only()            expr_,
                        day_only_lc()         expr_,
                        hour_in_day()         expr_,
                        hour_in_day_lc()      expr_,
                        week_in_month()       expr_,
                        week_in_month_lc()    expr_,
                        week_in_year()        expr_,
                        week_in_year_lc()     expr_
                    from contact
                    `;
                const expects = [
                    { expr_foo: '', expr_quux: '', expr_corge: '', expr_grault: '', expr_garply: '' },
                    { expr_foo: '', expr_quux: '', expr_corge: '', expr_grault: '', expr_garply: '' },
                    { expr_foo: '', expr_quux: '', expr_corge: '', expr_grault: '', expr_garply: '' },
                    { expr_foo: '', expr_quux: '', expr_corge: '', expr_grault: '', expr_garply: '' },
                    { expr_foo: '', expr_quux: '', expr_corge: '', expr_grault: '', expr_garply: '' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });
    */
});
