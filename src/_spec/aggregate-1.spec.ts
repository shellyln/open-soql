
import { parse }                    from '../lib/parser';
import { prepareQuery,
         prepareBuilderInfo }       from '../lib/prepare';
import { getObjectValue }           from '../lib/util';
import { QueryBuilderInfoInternal } from '../types';
import { build }                    from '../builder';
import { staticJsonResolverBuilder,
         staticCsvResolverBuilder,
         passThroughResolverBuilder } from '../resolvers';



describe("aggregate-1", function() {
    it("Aggregation query (1)", async function() {
        const { soql, insert, update, remove, transaction } = build({
            resolvers: {
                query: {
                    Contact: staticCsvResolverBuilder(
                        'Contact', () => Promise.resolve(`
                            Id         , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                 , Zzz , AccountId
                            Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   ,   1 , Account/z1
                            Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z1
                            Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" ,   1 , "Account/z2"
                            Contact/z4 , aaa/z4   , bbb/z4   , ccc/z4   , ddd/z4   , eee/z4   ,     3.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z2
                            Contact/z5 , aaa/z5   , bbb/z5   , ccc/z5   , ddd/z5   , eee/z5   ,     5.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   1 , Account/z3
                            Contact/z6 , aaa/z6   , bbb/z6   , ccc/z6   , ddd/z6   , eee/z6   ,     7.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   1 , Account/z3
                            Contact/z7 , aaa/z7   , bbb/z7   , ccc/z7   , ddd/z7   , eee/z7   ,    11.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z3
                            Contact/z8 ,          ,          ,          ,          ,          ,         ,              ,                        ,   1 ,
                            Contact/z9 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                        ,   1 ,
                        `)
                    ),
                },
            },
        });

        {
            const result = await soql`
                select
                    count(), count(accountid), count_distinct(accountid),
                    count(foo), count_distinct(foo),
                    min(foo), max(bar), avg(baz), sum(qux),
                    min(corge), max(corge), avg(corge)
                from contact
                group by accountid`;
            const expects = [
                { expr0: 2, expr1: 2, expr2: 1, expr3: 2, expr4: 2, expr5: 'aaa/z1', expr6: 'bbb/z2', expr7: null, expr8: null, expr9:   -1, expr10:    0, expr11: -0.5 },
                { expr0: 2, expr1: 2, expr2: 1, expr3: 2, expr4: 2, expr5: 'aaa/z3', expr6: 'bbb/z4', expr7: null, expr8: null, expr9:    1, expr10:    3, expr11: 2 },
                { expr0: 3, expr1: 3, expr2: 1, expr3: 3, expr4: 3, expr5: 'aaa/z5', expr6: 'bbb/z7', expr7: null, expr8: null, expr9:    5, expr10:   11, expr11: 7.666666666666667 },
                { expr0: 1, expr1: 0, expr2: 0, expr3: 0, expr4: 0, expr5: null    , expr6: null    , expr7: null, expr8: null, expr9: null, expr10: null, expr11: null },
                { expr0: 1, expr1: 0, expr2: 0, expr3: 1, expr4: 1, expr5: ''      , expr6: ''      , expr7: null, expr8: null, expr9: null, expr10: null, expr11: null },
            ];
            expect(result).toEqual(expects);
        }

        {
            const result = await soql`
                select
                    count() cnt, count(accountid) cntacc, count_distinct(accountid) cntdacc,
                    count(foo) cntfoo, count_distinct(foo) cntdfoo,
                    min(foo) minfoo, max(bar) maxbar, avg(baz) avgbaz, sum(qux) sumqux,
                    min(corge) minc, max(corge) maxc, avg(corge) avgc
                from contact
                group by accountid`;
            const expects = [
                { cnt: 2, cntacc: 2, cntdacc: 1, cntfoo: 2, cntdfoo: 2, minfoo: 'aaa/z1', maxbar: 'bbb/z2', avgbaz: null, sumqux: null, minc:   -1, maxc:    0, avgc: -0.5 },
                { cnt: 2, cntacc: 2, cntdacc: 1, cntfoo: 2, cntdfoo: 2, minfoo: 'aaa/z3', maxbar: 'bbb/z4', avgbaz: null, sumqux: null, minc:    1, maxc:    3, avgc: 2 },
                { cnt: 3, cntacc: 3, cntdacc: 1, cntfoo: 3, cntdfoo: 3, minfoo: 'aaa/z5', maxbar: 'bbb/z7', avgbaz: null, sumqux: null, minc:    5, maxc:   11, avgc: 7.666666666666667 },
                { cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 0, cntdfoo: 0, minfoo: null    , maxbar: null    , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
                { cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 1, cntdfoo: 1, minfoo: ''      , maxbar: ''      , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
            ];
            expect(result).toEqual(expects);
        }

        {
            try {
                const result = await soql`
                    select
                        foo,
                        count() cnt, count(accountid) cntacc, count_distinct(accountid) cntdacc,
                        count(foo) cntfoo, count_distinct(foo) cntdfoo,
                        min(foo) minfoo, max(bar) maxbar, avg(baz) avgbaz, sum(qux) sumqux,
                        min(corge) minc, max(corge) maxc, avg(corge) avgc
                    from contact
                    group by accountid`;
                expect(0).toEqual(1);
            } catch (e) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                expect((e as any).message).toEqual('contact.foo is not allowed. Aggregate function is needed.');
            }
        }

        {
            const result = await soql`
                select
                    accountid,
                    count() cnt, count(accountid) cntacc, count_distinct(accountid) cntdacc,
                    count(foo) cntfoo, count_distinct(foo) cntdfoo,
                    min(foo) minfoo, max(bar) maxbar, avg(baz) avgbaz, sum(qux) sumqux,
                    min(corge) minc, max(corge) maxc, avg(corge) avgc
                from contact
                group by accountid`;
            const expects = [
                { AccountId: 'Account/z1', cnt: 2, cntacc: 2, cntdacc: 1, cntfoo: 2, cntdfoo: 2, minfoo: 'aaa/z1', maxbar: 'bbb/z2', avgbaz: null, sumqux: null, minc:   -1, maxc:    0, avgc: -0.5 },
                { AccountId: 'Account/z2', cnt: 2, cntacc: 2, cntdacc: 1, cntfoo: 2, cntdfoo: 2, minfoo: 'aaa/z3', maxbar: 'bbb/z4', avgbaz: null, sumqux: null, minc:    1, maxc:    3, avgc: 2 },
                { AccountId: 'Account/z3', cnt: 3, cntacc: 3, cntdacc: 1, cntfoo: 3, cntdfoo: 3, minfoo: 'aaa/z5', maxbar: 'bbb/z7', avgbaz: null, sumqux: null, minc:    5, maxc:   11, avgc: 7.666666666666667 },
                { AccountId: null        , cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 0, cntdfoo: 0, minfoo: null    , maxbar: null    , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
                { AccountId: null        , cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 1, cntdfoo: 1, minfoo: ''      , maxbar: ''      , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
            ];
            expect(result).toEqual(expects);
        }

        {
            const result = await soql`
                select
                    accountid accid,
                    count() cnt, count(accountid) cntacc, count_distinct(accountid) cntdacc,
                    count(foo) cntfoo, count_distinct(foo) cntdfoo,
                    min(foo) minfoo, max(bar) maxbar, avg(baz) avgbaz, sum(qux) sumqux,
                    min(corge) minc, max(corge) maxc, avg(corge) avgc
                from contact
                group by accountid`;
            const expects = [
                { accid: 'Account/z1', cnt: 2, cntacc: 2, cntdacc: 1, cntfoo: 2, cntdfoo: 2, minfoo: 'aaa/z1', maxbar: 'bbb/z2', avgbaz: null, sumqux: null, minc:   -1, maxc:    0, avgc: -0.5 },
                { accid: 'Account/z2', cnt: 2, cntacc: 2, cntdacc: 1, cntfoo: 2, cntdfoo: 2, minfoo: 'aaa/z3', maxbar: 'bbb/z4', avgbaz: null, sumqux: null, minc:    1, maxc:    3, avgc: 2 },
                { accid: 'Account/z3', cnt: 3, cntacc: 3, cntdacc: 1, cntfoo: 3, cntdfoo: 3, minfoo: 'aaa/z5', maxbar: 'bbb/z7', avgbaz: null, sumqux: null, minc:    5, maxc:   11, avgc: 7.666666666666667 },
                { accid: null        , cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 0, cntdfoo: 0, minfoo: null    , maxbar: null    , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
                { accid: null        , cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 1, cntdfoo: 1, minfoo: ''      , maxbar: ''      , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
            ];
            expect(result).toEqual(expects);
        }
    });


    it("Aggregation query with condition (1)", async function() {
        const { soql, insert, update, remove, transaction } = build({
            resolvers: {
                query: {
                    Contact: staticCsvResolverBuilder(
                        'Contact', () => Promise.resolve(`
                            Id         , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                 , Zzz , AccountId
                            Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   ,   1 , Account/z1
                            Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z1
                            Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" ,   1 , "Account/z2"
                            Contact/z4 , aaa/z4   , bbb/z4   , ccc/z4   , ddd/z4   , eee/z4   ,     3.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z2
                            Contact/z5 , aaa/z5   , bbb/z5   , ccc/z5   , ddd/z5   , eee/z5   ,     5.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   1 , Account/z3
                            Contact/z6 , aaa/z6   , bbb/z6   , ccc/z6   , ddd/z6   , eee/z6   ,     7.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   1 , Account/z3
                            Contact/z7 , aaa/z7   , bbb/z7   , ccc/z7   , ddd/z7   , eee/z7   ,    11.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z3
                            Contact/z8 ,          ,          ,          ,          ,          ,         ,              ,                        ,   1 ,
                            Contact/z9 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                        ,   1 ,
                        `)
                    ),
                },
            },
        });

        {
            const result = await soql`
                select
                    accountid accid,
                    count() cnt, count(accountid) cntacc, count_distinct(accountid) cntdacc,
                    count(foo) cntfoo, count_distinct(foo) cntdfoo,
                    min(foo) minfoo, max(bar) maxbar, avg(baz) avgbaz, sum(qux) sumqux,
                    min(corge) minc, max(corge) maxc, avg(corge) avgc
                from contact
                where zzz=1
                group by accountid`;
            const expects = [
                { accid: 'Account/z1', cnt: 1, cntacc: 1, cntdacc: 1, cntfoo: 1, cntdfoo: 1, minfoo: 'aaa/z1', maxbar: 'bbb/z1', avgbaz: null, sumqux: null, minc:   -1, maxc:   -1, avgc:   -1 },
                { accid: 'Account/z2', cnt: 1, cntacc: 1, cntdacc: 1, cntfoo: 1, cntdfoo: 1, minfoo: 'aaa/z3', maxbar: 'bbb/z3', avgbaz: null, sumqux: null, minc:    1, maxc:    1, avgc:    1 },
                { accid: 'Account/z3', cnt: 2, cntacc: 2, cntdacc: 1, cntfoo: 2, cntdfoo: 2, minfoo: 'aaa/z5', maxbar: 'bbb/z6', avgbaz: null, sumqux: null, minc:    5, maxc:    7, avgc:    6 },
                { accid: null        , cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 0, cntdfoo: 0, minfoo: null    , maxbar: null    , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
                { accid: null        , cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 1, cntdfoo: 1, minfoo: ''      , maxbar: ''      , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
            ];
            expect(result).toEqual(expects);
        }
    });


    it("Aggregation query with having clause (1)", async function() {
        const { soql, insert, update, remove, transaction } = build({
            resolvers: {
                query: {
                    Contact: staticCsvResolverBuilder(
                        'Contact', () => Promise.resolve(`
                            Id         , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                 , Zzz , AccountId
                            Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   ,   1 , Account/z1
                            Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z1
                            Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" ,   1 , "Account/z2"
                            Contact/z4 , aaa/z4   , bbb/z4   , ccc/z4   , ddd/z4   , eee/z4   ,     3.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z2
                            Contact/z5 , aaa/z5   , bbb/z5   , ccc/z5   , ddd/z5   , eee/z5   ,     5.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   1 , Account/z3
                            Contact/z6 , aaa/z6   , bbb/z6   , ccc/z6   , ddd/z6   , eee/z6   ,     7.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   1 , Account/z3
                            Contact/z7 , aaa/z7   , bbb/z7   , ccc/z7   , ddd/z7   , eee/z7   ,    11.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z3
                            Contact/z8 ,          ,          ,          ,          ,          ,         ,              ,                        ,   1 ,
                            Contact/z9 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                        ,   1 ,
                        `)
                    ),
                },
            },
        });

        {
            const result = await soql`
                select
                    accountid accid,
                    count() cnt, count(accountid) cntacc, count_distinct(accountid) cntdacc,
                    count(foo) cntfoo, count_distinct(foo) cntdfoo,
                    min(foo) minfoo, max(bar) maxbar, avg(baz) avgbaz, sum(qux) sumqux,
                    min(corge) minc, max(corge) maxc, avg(corge) avgc
                from contact
                group by accountid
                having count() >= 3`;
            const expects = [
                { accid: 'Account/z3', cnt: 3, cntacc: 3, cntdacc: 1, cntfoo: 3, cntdfoo: 3, minfoo: 'aaa/z5', maxbar: 'bbb/z7', avgbaz: null, sumqux: null, minc:    5, maxc:   11, avgc: 7.666666666666667 },
            ];
            expect(result).toEqual(expects);
        }

        {
            const result = await soql`
                select
                    accountid accid,
                    count() cnt, count(accountid) cntacc, count_distinct(accountid) cntdacc,
                    count(foo) cntfoo, count_distinct(foo) cntdfoo,
                    min(foo) minfoo, max(bar) maxbar, avg(baz) avgbaz, sum(qux) sumqux,
                    min(corge) minc, max(corge) maxc, avg(corge) avgc
                from contact
                where zzz=1
                group by accountid
                having count() >= 2`;
            const expects = [
                { accid: 'Account/z3', cnt: 2, cntacc: 2, cntdacc: 1, cntfoo: 2, cntdfoo: 2, minfoo: 'aaa/z5', maxbar: 'bbb/z6', avgbaz: null, sumqux: null, minc:    5, maxc:    7, avgc:    6 },
            ];
            expect(result).toEqual(expects);
        }
    });


    it("Aggregation query with sorting (1)", async function() {
        const { soql, insert, update, remove, transaction } = build({
            resolvers: {
                query: {
                    Contact: staticCsvResolverBuilder(
                        'Contact', () => Promise.resolve(`
                            Id         , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                 , Zzz , AccountId
                            Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   ,   1 , Account/z1
                            Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z1
                            Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" ,   1 , "Account/z2"
                            Contact/z4 , aaa/z4   , bbb/z4   , ccc/z4   , ddd/z4   , eee/z4   ,     3.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z2
                            Contact/z5 , aaa/z5   , bbb/z5   , ccc/z5   , ddd/z5   , eee/z5   ,     5.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   1 , Account/z3
                            Contact/z6 , aaa/z6   , bbb/z6   , ccc/z6   , ddd/z6   , eee/z6   ,     7.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   1 , Account/z3
                            Contact/z7 , aaa/z7   , bbb/z7   , ccc/z7   , ddd/z7   , eee/z7   ,    11.0 , 2020-01-01   , 2020-01-01T00:00:00Z   ,   2 , Account/z3
                            Contact/z8 ,          ,          ,          ,          ,          ,         ,              ,                        ,   1 ,
                            Contact/z9 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                        ,   1 ,
                        `)
                    ),
                },
            },
        });

        {
            const result = await soql`
                select
                    accountid accid,
                    count() cnt, count(accountid) cntacc, count_distinct(accountid) cntdacc,
                    count(foo) cntfoo, count_distinct(foo) cntdfoo,
                    min(foo) minfoo, max(bar) maxbar, avg(baz) avgbaz, sum(qux) sumqux,
                    min(corge) minc, max(corge) maxc, avg(corge) avgc
                from contact
                where zzz=1
                group by accountid
                order by accid desc, minfoo asc`;
            const expects = [
                { accid: 'Account/z3', cnt: 2, cntacc: 2, cntdacc: 1, cntfoo: 2, cntdfoo: 2, minfoo: 'aaa/z5', maxbar: 'bbb/z6', avgbaz: null, sumqux: null, minc:    5, maxc:    7, avgc:    6 },
                { accid: 'Account/z2', cnt: 1, cntacc: 1, cntdacc: 1, cntfoo: 1, cntdfoo: 1, minfoo: 'aaa/z3', maxbar: 'bbb/z3', avgbaz: null, sumqux: null, minc:    1, maxc:    1, avgc:    1 },
                { accid: 'Account/z1', cnt: 1, cntacc: 1, cntdacc: 1, cntfoo: 1, cntdfoo: 1, minfoo: 'aaa/z1', maxbar: 'bbb/z1', avgbaz: null, sumqux: null, minc:   -1, maxc:   -1, avgc:   -1 },
                { accid: null        , cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 0, cntdfoo: 0, minfoo: null    , maxbar: null    , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
                { accid: null        , cnt: 1, cntacc: 0, cntdacc: 0, cntfoo: 1, cntdfoo: 1, minfoo: ''      , maxbar: ''      , avgbaz: null, sumqux: null, minc: null, maxc: null, avgc: null },
            ];
            expect(result).toEqual(expects);
        }
    });
});
