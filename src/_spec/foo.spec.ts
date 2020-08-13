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



const disablePrint: true | null = true;


describe("foo", function() {
    it("foo-1", function() {
        const z = parse(`
            Select
                id,Name
              , "住所"
              , count()
              , sum(foo.bar.baz)
              , sum( aaa . bbb . ccc ) sum1
              , avg(qqq, foo.bar.baz,true,2020-12-31, 100 , 'aaa' ,false)
              ,acc.Address   addr
              , Account . owner.Name
              /* comment */
              ,(Select id from details0 where a = 2020-12-31 and b=2020-12-31T23:59:59Z and c=2020-12-31T23:59:59-11:30)
              ,(Select id from details)
              ,( Select id from details2 )
              ,( Select id from details3 where foo in (1,2,3))
              ,( Select id from details3b where(foo not in(1,2,3)and bar not like'aa')group by aaa order by ccc)
              ,( Select id from details4 where foo in (select id from xxx))
              ,( Select id from details4b where foo in(select id from xxx)and bar='z')
              ,( Select id from details5 where(x=1)and(y=2))
              , (Select id, name from contacts where(  not (owner.email like 'aaa' and (x=3 or not y=4)))) cs
            from     Account   acc , acc.Contact ccc
            where numOfFoo = 13
            group by aaa,bbb,ccc
            having count(id)=10
            order by eee.id,fff deSC,qqq asc nulls last,ggg.name
            offset 888 limit 99
            for update viewstat, tracking
            -- for view, reference
        `);
        // disablePrint ?? console.log(JSON.stringify(z, null, 2));
        expect(1).toEqual(1);
    });

    it("foo-2", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
                functions: [{
                    type: 'scalar',
                    name: 'string',
                    fn: (ctx, args, records) => {
                        return String(args[0]);
                    },
                }, {
                    type: 'scalar',
                    name: 'number',
                    fn: (ctx, args, records) => {
                        return Number(args[0]);
                    },
                }, {
                    type: 'immediate-scalar',
                    name: 'cast_string',
                    fn: (ctx, args) => {
                        return String(args[0]);
                    },
                }, {
                    type: 'immediate-scalar',
                    name: 'cast_number',
                    fn: (ctx, args) => {
                        return Number(args[0]);
                    },
                }, {
                    type: 'immediate-scalar',
                    name: 'pass_thru',
                    fn: (ctx, args) => {
                        return args[0];
                    },
                }],
                events: {
                    beginTransaction: (evt) => {
                        return Promise.resolve();
                    },
                    endTransaction: (evt, err) => {
                        return Promise.resolve();
                    },
                    beginExecute: (evt) => {
                        return Promise.resolve();
                    },
                    endExecute: (evt, err) => {
                        return Promise.resolve();
                    },
                    beforeMasterSubQueries: (evt) => {
                        return Promise.resolve();
                    },
                    afterMasterSubQueries: (evt) => {
                        return Promise.resolve();
                    },
                    beforeDetailSubQueries: (evt) => {
                        return Promise.resolve();
                    },
                    afterDetailSubQueries: (evt) => {
                        return Promise.resolve();
                    },
                },
                resolvers: {
                    query: {
                        Account: (fields, conditions, limit, offset, ctx) => {
                            // console.log(JSON.stringify(fields));
                            // console.log(JSON.stringify(conditions, null, 2));
                            // console.log(JSON.stringify(ctx));
                            // console.log('----------------------------------------');
                            const o = {};
                            for (const field of fields) {
                                o[field] = `field:${field}/${offset ?? 1}`;
                            }
                            return Promise.resolve([{
                                ...o,
                                id: 'Account/1',
                                numOfEmployees: 5,
                                created: '2020-01-02',
                                updated: '2020-01-02',
                                foo: `field:foo/${offset ?? 1}:\\%_`,
                                bar: 'aaa;bbb;ccc',
                                quux: 'Event/2',
                                corge: 'Event/22',
                            }, {
                                ...o,
                                id: 'Account/2',
                                numOfEmployees: 5,
                                created: '2020-01-02',
                                updated: '2020-01-02',
                                foo: `field:foo/${offset !== null ? offset + 1 : 1}:\\%_`,
                                bar: 'aaa;bbb;ccc',
                                quux: 'Event/2',
                                corge: 'Event/22',
                            }]);
                        },
                        Contact: (fields, conditions, limit, offset, ctx) => {
                            // console.log(JSON.stringify(fields));
                            // console.log(JSON.stringify(conditions, null, 2));
                            // console.log(JSON.stringify(ctx));
                            // console.log('----------------------------------------');
                            const o = {};
                            for (const field of fields) {
                                o[field] = `field:${field}/${offset ?? 1}`;
                            }
                            return Promise.resolve([{
                                ...o,
                                id: 'Contact/1',
                                baz: 1,
                            }, {
                                ...o,
                                id: 'Contact/2',
                                baz: 2,
                            }]);
                        },
                        Opportunity: (fields, conditions, limit, offset, ctx) => {
                            // console.log(JSON.stringify(fields));
                            // console.log(JSON.stringify(conditions, null, 2));
                            // console.log(JSON.stringify(ctx));
                            // console.log('----------------------------------------');
                            const o = {};
                            for (const field of fields) {
                                o[field] = `field:${field}/${offset ?? 1}`;
                            }
                            return Promise.resolve([{
                                ...o,
                                id: 'Opportunity/1',
                                Amount: 10001,
                                DueDate: '2020-01-01',
                            }, {
                                ...o,
                                id: 'Opportunity/2',
                                Amount: 10001,
                                DueDate: '2020-01-01',
                            }]);
                        },
                        Event: (fields, conditions, limit, offset, ctx) => {
                            // console.log(JSON.stringify(fields));
                            // console.log(JSON.stringify(conditions, null, 2));
                            // console.log(JSON.stringify(ctx));
                            // console.log('----------------------------------------');
                            const o = {};
                            for (const field of fields) {
                                o[field] = `field:${field}/${offset ?? 1}`;
                            }
                            return Promise.resolve([{
                                ...o,
                                id: 'Event/1',
                            }, {
                                ...o,
                                id: 'Event/2',
                            }]);
                        },
                    },
                    insert: {
                        Contact: (records, ctx) => {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                            return Promise.resolve(records.map((x, i) => ({...x, id: `Contact/${i}`})));
                        }
                    },
                    update: {
                        Contact: (records, ctx) => {
                            return Promise.resolve(records);
                        }
                    },
                    remove: {
                        Contact: (records, ctx) => {
                            return Promise.resolve();
                        }
                    },
                },
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
            });

            const z = await soql`
                Select
                    acc.id         aid
                , aCc.Region     rEg
                , acC.Category   cAt
                , (
                    Select id, Name, account.category
                    from aCc.OpportunitiEs
                    -- where Amount > ${10001}
                    where Amount > ${10000}
                    order by DueDate desc limit 5
                    )
                , string(id)
                , string(foo)
                , string(reg)
                , string(acC.qux)
                , pass_thru(2020-01-01)
                , day_in_year(2020-04-01)
                , day_in_year(acc.updated)
                -- , __proto__
                -- , "__proto__"
                -- , wwwww __proto__
                from ContAct con, cOn.AccOunt Acc
                where
                (
                        number(acc.numOfEmployees) = 5
                    and acc.created > ${{type: 'date', value: '2020-01-01'}}
                    and acc.updated > 2020-01-01
                    and acc.foo like 'FI%:f__/%\\\\%\\_'
                    and acc.foo not like 'EI%:f__/%\\\\%\\_'
                    and acc.bar includes ('aaa;ccc', 'ccc')
                    and acc.bar excludes ('aaa;cc', 'cca')
                    and acc.quux in (Select id from Event)
                    and acc.corge not in (Select id from Event)
                    -- and __proto__ = 1
                    -- and __proto__.foo = 1
                    -- and acc.__proto__ = 1
                ) or (
                        acc.foo = 1
                    and acc.bar = 2
                    and acc.baz = 2
                ) or not (
                        acc.qux = 1
                    and acc.quux = 2
                    and acc.corge in (Select id from Event)
                )
                order by aid, reg, cat
                offset 0 limit 10
                for update viewstat, tracking
                -- for view, reference
                /* comment */
            `;
            disablePrint ?? console.log(JSON.stringify(z, null, 2));
            expect(1).toEqual(1);

            const zz = await soql`
                Select
                    count(),
                    count(id) cnt,
                    sum(bar) sum_bar,
                    avg(bar) avg_bar,
                    max(bar) max_bar,
                    min(bar) min_bar,
                    cast_string(${12345}) str,
                    cast_number('2234') num,
                    sum(baz) sum_baz,
                    avg(baz) avg_baz,
                    max(baz) max_baz,
                    min(baz) min_baz,
                    pass_thru(2020-01-01)
                from
                    Contact
                where
                    foo > ''
                group by Region
                -- group by foo
                -- group by id,foo
                having count(id) > 0
            `;
            disablePrint ?? console.log(JSON.stringify(zz, null, 2));

            const retI = await insert('contact', [{
                id: '1'
            }]);
            const retI2 = await insert('contact', {
                id: '1'
            });

            const retU = await update('contact', [{
                id: '1'
            }]);

            const retU2 = await update('contact', {
                id: '1'
            });

            const retR = await remove('contact', [{
                id: '1'
            }]);

            await transaction(async (commands, tr) => {
                const { soql } = commands;
                const retTrS = await soql`Select Id from event`;
                disablePrint ?? console.log(JSON.stringify(retTrS, null, 2));
            });
            expect(1).toEqual(1);
        }
    });

    it("foo-3", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql } = build({
                resolvers: {
                    query: {
                        Account: staticJsonResolverBuilder(
                            'Account', () => Promise.resolve(JSON.stringify([
                                { Id: 'Account/1', Name: 'Acme Inc.' },
                                { Id: 'Account/2', Name: 'Foobar Inc.' },
                            ]))
                        ),
                        Contact: staticJsonResolverBuilder(
                            'Contact', () => Promise.resolve(JSON.stringify([
                                { Id: 'Contact/1', Foo: 'aaa/1', Bar: 'bbb/1', Baz: 'ccc/1', Qux: 'ddd/1', Quux: 'eee/1', AccountId: 'Account/1' },
                                { Id: 'Contact/2', Foo: 'aaa/2', Bar: 'bbb/2', Baz: 'ccc/2', Qux: 'ddd/2', Quux: 'eee/2', AccountId: 'Account/1' },
                                { Id: 'Contact/3', Foo: 'aaa/3', Bar: 'bbb/3', Baz: 'ccc/3', Qux: 'ddd/3', Quux: 'eee/3', AccountId: 'Account/2' },
                            ]))
                        ),
                    }
                },
                relationships: {
                    Account: {
                        Contacts: ['Contact'],
                        // Contacts: ['Contact', 'Account'],
                    },
                    Contact: {
                        Account: 'Account',
                        // Account: { resolver: 'Account', id: 'AccountId' },
                    },
                },
            });
            const z = await soql<{id: string}>`
                Select
                    id, foo, bar, baz, acc.id, acc.name,
                    (Select Id, quux from acc.contacts)
                from contact, account acc
                where foo like ${'a%'}
            `;
            disablePrint ?? console.log(JSON.stringify(z, null, 2));
            expect(1).toEqual(1);
        }
    });

    it("foo-4", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql } = build({
                resolvers: {
                    query: {
                        Account: passThroughResolverBuilder(
                            'Account', () => Promise.resolve([
                                { Id: 'Account/1', Name: 'Acme Inc.' },
                                { Id: 'Account/2', Name: 'Foobar Inc.' },
                            ])
                        ),
                        Contact: passThroughResolverBuilder(
                            'Contact', () => Promise.resolve([
                                { Id: 'Contact/1', Foo: 'aaa/1', Bar: 'bbb/1', Baz: 'ccc/1', Qux: 'ddd/1', Quux: 'eee/1', AccountId: 'Account/1' },
                                { Id: 'Contact/2', Foo: 'aaa/2', Bar: 'bbb/2', Baz: 'ccc/2', Qux: 'ddd/2', Quux: 'eee/2', AccountId: 'Account/1' },
                                { Id: 'Contact/3', Foo: 'aaa/3', Bar: 'bbb/3', Baz: 'ccc/3', Qux: 'ddd/3', Quux: 'eee/3', AccountId: 'Account/2' },
                            ])
                        ),
                    }
                },
                relationships: {
                    Account: {
                        Contacts: ['Contact'],
                        // Contacts: ['Contact', 'Account'],
                    },
                    Contact: {
                        Account: 'Account',
                        // Account: { resolver: 'Account', id: 'AccountId' },
                    },
                },
            });
            const z = await soql`
                Select
                    id, foo, bar, baz, acc.id, acc.name,
                    (Select Id, quux from acc.contacts)
                from contact, account acc
                where foo like ${'a%'}
            `;
            disablePrint ?? console.log(JSON.stringify(z, null, 2));
            expect(1).toEqual(1);
        }
    });

    it("foo-5", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql } = build({
                resolvers: {
                    query: {
                        Account: staticCsvResolverBuilder(
                            'Account', () => Promise.resolve(`
                                Id,        Name
                                Account/z1,Acme Co.
                                Account/z2,Foobar Co.
                            `)
                        ),
                        Contact: staticCsvResolverBuilder(
                            'Contact', () => Promise.resolve(`
                                Id,         Foo,    Bar,    Baz,    Qux,    Quux,   AccountId
                                Contact/z1, aaa/z1, bbb/z1, ccc/z1, ddd/z1, eee/z1, Account/z1
                                Contact/z2, aaa/z2, bbb/z2, ccc/z2, ddd/z2, eee/z2, Account/z1
                                Contact/z3, aaa/z3, bbb/z3, ccc/z3, ddd/z3, eee/z3, Account/z2
                            `)
                        ),
                    }
                },
                relationships: {
                    Account: {
                        Contacts: ['Contact'],
                        // Contacts: ['Contact', 'Account'],
                    },
                    Contact: {
                        Account: 'Account',
                        // Account: { resolver: 'Account', id: 'AccountId' },
                    },
                },
            });
            const z = await soql`
                Select
                    id, foo, bar, baz, acc.id, acc.name,
                    (Select Id, quux from acc.contacts)
                from contact, account acc
                where foo like ${'a%'}
            `;
            disablePrint ?? console.log(JSON.stringify(z, null, 2));
            expect(1).toEqual(1);
        }
    });
});
