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


describe("functions-7", function() {
    it("Functions: convertTimezone (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        calendar_month(convertTimezone(grault)) d_utc,
                        calendar_month(convertTimezone(garply)) dt_utc,
                        calendar_month_lc(grault) d_lc,
                        calendar_month_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }

            {
                const result = await soql`
                    select
                        calendar_quarter(convertTimezone(grault)) d_utc,
                        calendar_quarter(convertTimezone(garply)) dt_utc,
                        calendar_quarter_lc(grault) d_lc,
                        calendar_quarter_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }

            {
                const result = await soql`
                    select
                        calendar_year(convertTimezone(grault)) d_utc,
                        calendar_year(convertTimezone(garply)) dt_utc,
                        calendar_year_lc(grault) d_lc,
                        calendar_year_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }

            {
                const result = await soql`
                    select
                        day_in_month(convertTimezone(grault)) d_utc,
                        day_in_month(convertTimezone(garply)) dt_utc,
                        day_in_month_lc(grault) d_lc,
                        day_in_month_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }

            {
                const result = await soql`
                    select
                        day_in_week(convertTimezone(grault)) d_utc,
                        day_in_week(convertTimezone(garply)) dt_utc,
                        day_in_week_lc(grault) d_lc,
                        day_in_week_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }

            {
                const result = await soql`
                    select
                        day_in_year(convertTimezone(grault)) d_utc,
                        day_in_year(convertTimezone(garply)) dt_utc,
                        day_in_year_lc(grault) d_lc,
                        day_in_year_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }

            {
                const result = await soql`
                    select
                        day_only(convertTimezone(grault)) d_utc,
                        day_only(convertTimezone(garply)) dt_utc,
                        day_only_lc(grault) d_lc,
                        day_only_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }

            {
                const result = await soql`
                    select
                        hour_in_day(convertTimezone(grault)) d_utc,
                        hour_in_day(convertTimezone(garply)) dt_utc,
                        hour_in_day_lc(grault) d_lc,
                        hour_in_day_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }

            {
                const result = await soql`
                    select
                        week_in_month(convertTimezone(grault)) d_utc,
                        week_in_month(convertTimezone(garply)) dt_utc,
                        week_in_month_lc(grault) d_lc,
                        week_in_month_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }

            {
                const result = await soql`
                    select
                        week_in_year(convertTimezone(grault)) d_utc,
                        week_in_year(convertTimezone(garply)) dt_utc,
                        week_in_year_lc(grault) d_lc,
                        week_in_year_lc(garply) dt_lc
                    from contact
                    `;
                expect(result.length).toEqual(5);
                for (const rec of result as any[]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['d_utc']).toEqual(rec['d_lc']);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect(rec['dt_utc']).toEqual(rec['dt_lc']);
                }
            }
        }
    });
});