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


describe("functions-1", function() {
    it("Functions (1): cast_to_string", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        cast_to_string(foo)    expr_foo,
                        cast_to_string(quux)   expr_quux,
                        cast_to_string(corge)  expr_corge,
                        cast_to_string(grault) expr_grault,
                        cast_to_string(garply) expr_garply
                    from contact
                    `;
                const expects = [
                    { expr_foo: 'aaa/z1', expr_quux: 'false', expr_corge: '-1', expr_grault: '2019-12-31', expr_garply: '2019-12-31T23:59:59Z' },
                    { expr_foo: 'aaa/z2', expr_quux: 'true' , expr_corge: '0' , expr_grault: '2020-01-01', expr_garply: '2020-01-01T00:00:00Z' },
                    { expr_foo: 'aaa/z3', expr_quux: null   , expr_corge: '1' , expr_grault: '2020-01-02', expr_garply: '2020-01-01T00:00:01Z' },
                    { expr_foo: null    , expr_quux: null   , expr_corge: null, expr_grault: null        , expr_garply: null                   },
                    { expr_foo: ''      , expr_quux: null   , expr_corge: null, expr_grault: null        , expr_garply: null                   },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Functions (2): cast_to_number", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        cast_to_number(foo)    expr_foo,
                        cast_to_number(quux)   expr_quux,
                        cast_to_number(corge)  expr_corge,
                        cast_to_number(grault) expr_grault,
                        cast_to_number(garply) expr_garply
                    from contact
                    `;
                const expects = [
                    { expr_foo:  NaN, expr_quux:    0, expr_corge:   -1, expr_grault:  NaN, expr_garply:  NaN },
                    { expr_foo:  NaN, expr_quux:    1, expr_corge:    0, expr_grault:  NaN, expr_garply:  NaN },
                    { expr_foo:  NaN, expr_quux: null, expr_corge:    1, expr_grault:  NaN, expr_garply:  NaN },
                    { expr_foo: null, expr_quux: null, expr_corge: null, expr_grault: null, expr_garply: null },
                    { expr_foo:    0, expr_quux: null, expr_corge: null, expr_grault: null, expr_garply: null }, // TODO: expr_foo
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Functions (3): cast_to_boolean", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        cast_to_boolean(foo)    expr_foo,
                        cast_to_boolean(quux)   expr_quux,
                        cast_to_boolean(corge)  expr_corge,
                        cast_to_boolean(grault) expr_grault,
                        cast_to_boolean(garply) expr_garply
                    from contact
                    `;
                const expects = [
                    { expr_foo:  true, expr_quux: false, expr_corge:  true, expr_grault: true, expr_garply: true },
                    { expr_foo:  true, expr_quux:  true, expr_corge: false, expr_grault: true, expr_garply: true },
                    { expr_foo:  true, expr_quux:  null, expr_corge:  true, expr_grault: true, expr_garply: true },
                    { expr_foo:  null, expr_quux:  null, expr_corge:  null, expr_grault: null, expr_garply: null },
                    { expr_foo: false, expr_quux:  null, expr_corge:  null, expr_grault: null, expr_garply: null },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Functions (1): concat", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        concat(foo)           expr_foo,
                        concat(foo,bar)       expr_foo_bar,
                        concat(foo,bar,baz)   expr_foo_bar_baz,
                        concat(foo,qux,baz)   expr_foo_qux_baz,
                        concat(qux,foo,qux)   expr_qux_foo_qux
                    from contact
                    `;
                const expects = [
                    { expr_foo: 'aaa/z1', expr_foo_bar: 'aaa/z1bbb/z1', expr_foo_bar_baz: 'aaa/z1bbb/z1ccc/z1', expr_foo_qux_baz: 'aaa/z1ccc/z1', expr_qux_foo_qux: 'aaa/z1' },
                    { expr_foo: 'aaa/z2', expr_foo_bar: 'aaa/z2bbb/z2', expr_foo_bar_baz: 'aaa/z2bbb/z2ccc/z2', expr_foo_qux_baz: 'aaa/z2ccc/z2', expr_qux_foo_qux: 'aaa/z2' },
                    { expr_foo: 'aaa/z3', expr_foo_bar: 'aaa/z3bbb/z3', expr_foo_bar_baz: 'aaa/z3bbb/z3ccc/z3', expr_foo_qux_baz: 'aaa/z3ccc/z3', expr_qux_foo_qux: 'aaa/z3' },
                    { expr_foo: null    , expr_foo_bar: null          , expr_foo_bar_baz: null                , expr_foo_qux_baz: null          , expr_qux_foo_qux: null     },
                    { expr_foo: ''      , expr_foo_bar: ''            , expr_foo_bar_baz: ' '                 , expr_foo_qux_baz: ' '           , expr_qux_foo_qux: ''       },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        concat('a','b','c')   expr_a,
                        concat(foo,'a')       expr_b,
                        concat(foo,null)      expr_c,
                        concat(null,foo,null) expr_d
                    from contact
                    `;
                const expects = [
                    { expr_a: 'abc', expr_b: 'aaa/z1a', expr_c: 'aaa/z1', expr_d: 'aaa/z1' },
                    { expr_a: 'abc', expr_b: 'aaa/z2a', expr_c: 'aaa/z2', expr_d: 'aaa/z2' },
                    { expr_a: 'abc', expr_b: 'aaa/z3a', expr_c: 'aaa/z3', expr_d: 'aaa/z3' },
                    { expr_a: 'abc', expr_b: 'a'      , expr_c: null    , expr_d: null     },
                    { expr_a: 'abc', expr_b: 'a'      , expr_c: ''      , expr_d: ''       },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`
                    select
                        concat(quux)          expr_quux,
                        concat(corge)         expr_corge,
                        concat(grault)        expr_grault,
                        concat(garply)        expr_garply
                    from contact
                    `;
                const expects = [
                    { expr_quux: 'false', expr_corge: '-1', expr_grault: '2019-12-31', expr_garply: '2019-12-31T23:59:59Z' },
                    { expr_quux: 'true' , expr_corge: '0' , expr_grault: '2020-01-01', expr_garply: '2020-01-01T00:00:00Z' },
                    { expr_quux: null   , expr_corge: '1' , expr_grault: '2020-01-02', expr_garply: '2020-01-01T00:00:01Z' },
                    { expr_quux: null   , expr_corge: null, expr_grault: null        , expr_garply: null                   },
                    { expr_quux: null   , expr_corge: null, expr_grault: null        , expr_garply: null                   },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Functions (1): add", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = commands1;

            {
                const result = await soql`
                    select
                        add(foo, null)    expr_foo,
                        add(quux, null)   expr_quux,
                        add(corge, null)  expr_corge,
                        add(grault, null) expr_grault,
                        add(garply, null) expr_garply
                    from contact
                    `;
                const expects = [
                    { expr_foo:  NaN, expr_quux:    0, expr_corge:   -1, expr_grault:  NaN, expr_garply:  NaN },
                    { expr_foo:  NaN, expr_quux:    1, expr_corge:    0, expr_grault:  NaN, expr_garply:  NaN },
                    { expr_foo:  NaN, expr_quux: null, expr_corge:    1, expr_grault:  NaN, expr_garply:  NaN },
                    { expr_foo: null, expr_quux: null, expr_corge: null, expr_grault: null, expr_garply: null },
                    { expr_foo:    0, expr_quux: null, expr_corge: null, expr_grault: null, expr_garply: null }, // TODO: expr_foo
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
                        sub()                 expr_,
                        mul()                 expr_,
                        div()                 expr_,
                        mod()                 expr_,
                        calendar_month()      expr_,
                        calendar_month_lc()   expr_,
                        calendar_quarter()    expr_,
                        calendar_quarter_lc() expr_,
                        calendar_year()       expr_,
                        calendar_year_lc()    expr_,
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
