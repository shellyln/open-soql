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



describe("query-1", function() {
    it("Simple query (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
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
                    },
                },
            });
            {
                const result = await soql`select id, foo, bar, baz from contact`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z4', Corge: null, Grault:         null, Garply:                   null },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Simple query with condition (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
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
                    },
                },
            });

            {
                const result = await soql`select id, foo, bar, baz from contact where foo='aaa/z1'`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact where foo='aaa/z1' and bar='bbb/z1'`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact where foo='aaa/z1' and bar=null`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact where foo='aaa/z1' and bar!=null`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact where foo='aaa/z1' and not bar=null`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact where foo='aaa/z1' or foo=null`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact where foo='aaa/z1' or not foo=null`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, corge, grault, garply from contact where foo='aaa/z1'`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where foo='aaa/z1' and bar='bbb/z1'`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where foo='aaa/z1' and bar=null`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where foo='aaa/z1' and bar!=null`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where foo='aaa/z1' and not bar=null`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where foo='aaa/z1' or foo=null`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z4', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where foo='aaa/z1' or not foo=null`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, corge, grault, garply from contact where (foo='aaa/z1' or not foo=null)`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where (foo='aaa/z1') or not (foo=null)`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where (foo='aaa/z1') or (not foo=null)`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where (foo='aaa/z1') or (not (foo=null))`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where ((foo='aaa/z1') or (not (foo=null)))`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, corge, grault, garply from contact where (((foo='aaa/z1') or (not (foo=null))))`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Simple query with resolver and field alias names (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
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
                    },
                },
            });

            {
                const result = await soql`select id zid, foo zfoo, bar zbar, baz zbax from contact`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id zid, foo zfoo, bar zbar, baz zbax from contact con`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select con.id zid, con.foo zfoo, con.bar zbar, con.baz zbax from contact con`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select con.id zid, con.foo zfoo, con.bar zbar, con.baz zbax from contact con where contact.foo='aaa/z1'`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select con.id zid, con.foo zfoo, con.bar zbar, con.baz zbax from contact con where con.foo='aaa/z1'`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select con.id zid, con.foo zfoo, con.bar zbar, con.baz zbax from contact con where zfoo='aaa/z1'`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id zid, corge zcorge, grault zgrault, garply zgarply from contact`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z4', Corge: null, Grault:         null, Garply:                   null },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id zid, corge zcorge, grault zgrault, garply zgarply from contact con`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z4', Corge: null, Grault:         null, Garply:                   null },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select con.id zid, con.corge zcorge, con.grault zgrault, con.garply zgarply from contact con`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z4', Corge: null, Grault:         null, Garply:                   null },
                    { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                   null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select con.id zid, con.corge zcorge, con.grault zgrault, con.garply zgarply from contact con where contact.foo='aaa/z1'`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select con.id zid, con.corge zcorge, con.grault zgrault, con.garply zgarply from contact con where con.foo='aaa/z1'`;
                const expects = [
                    { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59Z' },
                ];
                expect(result).toEqual(expects);
            }
            {
                try {
                    await soql`select con.id zid, con.corge zcorge, con.grault zgrault, con.garply zgarply from contact con where zfoo='aaa/z1'`;
                    expect(1).toEqual(0);
                } catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    expect((e as any).message).toEqual('Field "zfoo" is not supplied from resolver "Contact".');
                }
            }
        }
    });


    it("Simple query with limit and ofset (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
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
                    },
                },
            });

            {
                const result = await soql`select id, foo, bar, baz from contact offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, foo, bar, baz from contact con offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact con limit 2 offset 0`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, foo, bar, baz from contact limit 2 offset 0`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, foo, bar, baz from contact offset ${1} limit ${2}`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Simple query with limit and ofset (2); + order by", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
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
                    },
                },
            });

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls first offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls first offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls first offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls first offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls first offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls first offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls last offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls last offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls last offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls last offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls last offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo nulls last offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Simple query with limit and ofset (3); + order by asc", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
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
                    },
                },
            });

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls first offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls first offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls first offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls first offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls first offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls first offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls last offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls last offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls last offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls last offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls last offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo asc nulls last offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Simple query with limit and ofset (4); + order by desc", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
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
                    },
                },
            });

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls first offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls first offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls first offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls first offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls first offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls first offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls last offset 0 limit 2`;
                const expects = [
                    { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null },
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls last offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls last offset 2 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls last offset 3 limit 2`;
                const expects = [
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls last offset 4 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls last offset 5 limit 2`;
                const expects = [
                ] as any[];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Simple query with limit and ofset (4); + order by (un-selected column)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
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
                    },
                },
            });

            {
                const result = await soql`select id, corge, grault, garply from contact order by foo desc nulls last offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01Z' },
                    { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00Z' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });


    it("Simple query with limit and ofset (5); + order by (multiple columns)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            const { soql, insert, update, remove, transaction } = build({
                resolvers: {
                    query: {
                        Contact: staticCsvResolverBuilder(
                            'Contact', () => Promise.resolve(`
                                Id         , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                 , AccountId
                                Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   , Account/z1
                                Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z1
                                Contact/z3 , "aaa/z2" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" , "Account/z2"
                                Contact/z4 ,          ,          ,          ,          ,          ,         ,              ,                        ,
                                Contact/z5 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                        ,
                            `)
                        ),
                    },
                },
            });

            {
                const result = await soql`select id, foo, bar, baz from contact order by foo desc nulls last, bar asc nulls first offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2' },
                    { Id: 'Contact/z3', Foo: 'aaa/z2', Bar: 'bbb/z3', Baz: 'ccc/z3' },
                ];
                expect(result).toEqual(expects);
            }
            {
                const result = await soql`select id, foo, bar, baz from contact order by bar asc nulls first, foo desc nulls last offset 1 limit 2`;
                const expects = [
                    { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ' },
                    { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1' },
                ];
                expect(result).toEqual(expects);
            }
        }
    });
});
