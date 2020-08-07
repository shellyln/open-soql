
import { parse }                    from '../lib/parser';
import { prepareQuery,
         prepareBuilderInfo }       from '../lib/prepare';
import { getObjectValue }           from '../lib/util';
import { QueryBuilderInfoInternal } from '../types';
import { build }                    from '../builder';
import { staticJsonResolverBuilder,
         staticCsvResolverBuilder,
         passThroughResolverBuilder } from '../resolvers';



describe("query-1", function() {
    it("simple-query-1", async function() {
        const { soql, insert, update, remove, transaction } = build({
            resolvers: {
                query: {
                    Contact: staticCsvResolverBuilder(
                        'Contact', () => Promise.resolve(`
                            Id         , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                , AccountId
                            Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59   , Account/z1
                            Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00   , Account/z1
                            Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01" , "Account/z2"
                            Contact/z4 ,          ,          ,          ,          ,          ,         ,              ,                       ,
                            Contact/z5 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                       ,
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
                { Id: 'Contact/z1', Corge:   -1, Grault: '2019-12-31', Garply: '2019-12-31T23:59:59' },
                { Id: 'Contact/z2', Corge:    0, Grault: '2020-01-01', Garply: '2020-01-01T00:00:00' },
                { Id: 'Contact/z3', Corge:    1, Grault: '2020-01-02', Garply: '2020-01-01T00:00:01' },
                { Id: 'Contact/z4', Corge: null, Grault:         null, Garply:                  null },
                { Id: 'Contact/z5', Corge: null, Grault:         null, Garply:                  null },
            ];
            expect(result).toEqual(expects);
        }
    });
});
