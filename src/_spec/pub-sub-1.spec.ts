// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { parse }                    from '../lib/parser';
import { prepareQuery,
         prepareBuilderInfo }       from '../lib/prepare';
import { getObjectValue }           from '../lib/util';
import { QueryBuilderInfoInternal,
         SubscriberEventCallbackParam,
         SubscriberEventCallback }  from '../types';
import { build }                    from '../builder';
import { setDefaultStaticResolverConfig,
         staticJsonResolverBuilder,
         staticCsvResolverBuilder,
         passThroughResolverBuilder } from '../resolvers';
import { resolverConfigs }            from './helpers/config';



function yieldFn() {
    const promise = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 0);
    });
    return promise;
}


describe("pub-sub-1", function() {
    it("Pub / Sub (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            let removed: any = null;

            const { soql, insert, update, remove, transaction, subscribe, unsubscribe } = build({
                resolvers: {
                    query: {
                        Contact: staticCsvResolverBuilder(
                            'Contact', () => Promise.resolve(`
                                Id  , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                 , Count
                                991 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   ,     0
                                992 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,     0
                                993 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" ,     0
                                994 ,          ,          ,          ,          ,          ,         ,              ,                        ,     0
                                995 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                        ,     0
                            `)
                        ),
                    },
                    insert: {
                        Contact: (records, ctx) => {
                            return Promise.resolve(records.map((x, index) => {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                return { ...x, Id: `Contact/z${index + 1}` };
                            }));
                        }
                    },
                    update: {
                        Contact: (records, ctx) => {
                            return Promise.resolve(records.map((x, index) => {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-member-access
                                return { ...x, Count: (x as any).Count + 1 };
                            }));
                        }
                    },
                    remove: {
                        Contact: (records, ctx) => {
                            removed = records.map((x, index) => {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                return { ...x, Count: 999 };
                            });
                            return Promise.resolve();
                        }
                    },
                },
            });

            const testData = await soql`
                Select Foo, Bar, Baz, Qux, Quux, Corge, Grault, Garply, Count
                from Contact`;

            const callbackResults: SubscriberEventCallbackParam[] = [];
            const fnSubContactWildcard1: SubscriberEventCallback = (param) => {
                callbackResults.push(param);
            };


            callbackResults.length = 0;
            subscribe('Contact', null, fnSubContactWildcard1);
            subscribe('Contact', 'Contact/z2', fnSubContactWildcard1);
            subscribe('Contact', 'Contact/z4', fnSubContactWildcard1);
            const inserted = await insert('Contact', testData);
            {
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1', Qux: 'ddd/z1', Quux: 'eee/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z', Count: 0 },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2', Qux: 'ddd/z2', Quux: 'eee/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z', Count: 0 },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3', Qux: 'ddd/z3', Quux: 'eee/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z', Count: 0 },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null, Qux:     null, Quux:     null, Corge: null, Grault:         null, Garply:                   null, Count: 0 },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ', Qux:       '', Quux:       '', Corge: null, Grault:         null, Garply:                   null, Count: 0 },
                ];
                expect(inserted).toEqual(expects);
            }
            await yieldFn();
            expect(callbackResults).toEqual([
                { on: 'insert', resolver: 'Contact', id: null },
                { on: 'insert', resolver: 'Contact', id: 'Contact/z2' },
                { on: 'insert', resolver: 'Contact', id: 'Contact/z4' },
            ]);
            unsubscribe('Contact', null, fnSubContactWildcard1);
            unsubscribe('Contact', 'Contact/z2', fnSubContactWildcard1);
            unsubscribe('Contact', 'Contact/z4', fnSubContactWildcard1);


            callbackResults.length = 0;
            subscribe('Contact', null, fnSubContactWildcard1);
            subscribe('Contact', 'Contact/z2', fnSubContactWildcard1);
            subscribe('Contact', 'Contact/z4', fnSubContactWildcard1);
            const updated = await update('Contact', inserted);
            {
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1', Qux: 'ddd/z1', Quux: 'eee/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z', Count: 1 },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2', Qux: 'ddd/z2', Quux: 'eee/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z', Count: 1 },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3', Qux: 'ddd/z3', Quux: 'eee/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z', Count: 1 },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null, Qux:     null, Quux:     null, Corge: null, Grault:         null, Garply:                   null, Count: 1 },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ', Qux:       '', Quux:       '', Corge: null, Grault:         null, Garply:                   null, Count: 1 },
                ];
                expect(updated).toEqual(expects);
            }
            await yieldFn();
            expect(callbackResults).toEqual([
                { on: 'update', resolver: 'Contact', id: null },
                { on: 'update', resolver: 'Contact', id: 'Contact/z2' },
                { on: 'update', resolver: 'Contact', id: 'Contact/z4' },
            ]);
            unsubscribe('Contact', null, fnSubContactWildcard1);
            unsubscribe('Contact', 'Contact/z2', fnSubContactWildcard1);
            unsubscribe('Contact', 'Contact/z4', fnSubContactWildcard1);


            callbackResults.length = 0;
            subscribe('Contact', null, fnSubContactWildcard1);
            subscribe('Contact', 'Contact/z2', fnSubContactWildcard1);
            subscribe('Contact', 'Contact/z4', fnSubContactWildcard1);
            await remove('Contact', updated);
            {
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1', Qux: 'ddd/z1', Quux: 'eee/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z', Count: 999 },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2', Qux: 'ddd/z2', Quux: 'eee/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z', Count: 999 },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3', Qux: 'ddd/z3', Quux: 'eee/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z', Count: 999 },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null, Qux:     null, Quux:     null, Corge: null, Grault:         null, Garply:                   null, Count: 999 },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ', Qux:       '', Quux:       '', Corge: null, Grault:         null, Garply:                   null, Count: 999 },
                ];
                expect(removed).toEqual(expects);
            }
            await yieldFn();
            expect(callbackResults).toEqual([
                { on: 'remove', resolver: 'Contact', id: null },
                { on: 'remove', resolver: 'Contact', id: 'Contact/z2' },
                { on: 'remove', resolver: 'Contact', id: 'Contact/z4' },
            ]);
            unsubscribe('Contact', null, fnSubContactWildcard1);
            unsubscribe('Contact', 'Contact/z2', fnSubContactWildcard1);
            unsubscribe('Contact', 'Contact/z4', fnSubContactWildcard1);
        }
    });
});
