// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { build }                    from '../builder';
import { setDefaultStaticResolverConfig,
         staticCsvResolverBuilder } from '../resolvers';
import { resolverConfigs }          from './helpers/config';



const relationships1 = {
    Account: {
        // Contacts: ['Contact'],
        Contacts: ['Contact', 'Account'],
        // Opportunities: ['Opportunity'],
        Opportunities: ['Opportunity', 'Account'],
    },
    Contact: {
        // Account: 'Account',
        Account: { resolver: 'Account', id: 'AccountId' },
    },
    Opportunity: {
        // Account: 'Account',
        Account: { resolver: 'Account', id: 'AccountId' },
    },
    Event: {
        Account: { resolver: 'Account', id: 'WhatId' },
        Contact: { resolver: 'Contact', id: 'WhatId' },
        Opportunity: { resolver: 'Opportunity', id: 'WhatId' },
    },
};

const queryResolvers1 = {
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
};


describe("trans-and-events-1", function() {
    it("Events without transaction (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            {
                let count = 0;
                const eventsResult: Array<[number, string, string[] | undefined | null]> = [];
                let removed: any = null;

                const commands1 = build({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    relationships: relationships1 as any,
                    resolvers: {
                        query: queryResolvers1,
                        insert: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'insert', void 0]);
                                return Promise.resolve(records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                    return { ...x, Id: `Contact/z${index + 1}` };
                                }));
                            }
                        },
                        update: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'update', void 0]);
                                return Promise.resolve(records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-member-access
                                    return { ...x, Count: (x as any).Count + 1 };
                                }));
                            }
                        },
                        remove: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'remove', void 0]);
                                removed = records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                    return { ...x, Count: 999 };
                                });
                                return Promise.resolve();
                            }
                        },
                    },
                    events: {
                        beginTransaction: (evt) => {
                            eventsResult.push([count++, 'beginTransaction', evt.graphPath]);
                            return Promise.resolve();
                        },
                        endTransaction: (evt, err) => {
                            eventsResult.push([count++, err ? `endTransaction(error:${err.message})` : 'endTransaction', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beginExecute: (evt) => {
                            eventsResult.push([count++, 'beginExecute', evt.graphPath]);
                            return Promise.resolve();
                        },
                        endExecute: (evt, err) => {
                            eventsResult.push([count++, err ? `endExecute(error:${err.message})` : 'endExecute', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beforeMasterSubQueries: (evt) => {
                            eventsResult.push([count++, 'beforeMasterSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        afterMasterSubQueries: (evt) => {
                            eventsResult.push([count++, 'afterMasterSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beforeDetailSubQueries: (evt) => {
                            eventsResult.push([count++, 'beforeDetailSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        afterDetailSubQueries: (evt) => {
                            eventsResult.push([count++, 'afterDetailSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                    },
                });

                const { compile, soql, insert, update, remove, transaction } = commands1;

                for (let i = 0; i < 2; i++) {
                    const result = await soql`
                        select
                            id, foo, bar, baz,
                            account.id, account.name,
                            (select id, name, amount from account.opportunities)
                        from contact, account`;
                    const expects = [
                        { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                        Account: { Id: 'Account/z1', Name: 'fff/z1',
                        Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                        { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                        { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                        Account: { Id: 'Account/z1', Name: 'fff/z1',
                        Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                        { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                        { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                        Account: { Id: 'Account/z2', Name: 'fff/z2',
                        Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                        { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                        { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                        Account: null },
                        { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                        Account: null },
                    ];
                    expect(result).toEqual(expects);

                    const query = compile`
                        select
                            id, foo, bar, baz,
                            account.id, account.name,
                            (select id, name, amount from account.opportunities)
                        from contact, account`;
                    const result2 = await query.execute();
                    expect(result2).toEqual(expects);

                    const inserted = await insert('Contact', [{Count: 0}, {Count: 0}] as any[]);
                    expect(inserted).toEqual([{Id: 'Contact/z1', Count: 0}, {Id: 'Contact/z2', Count: 0}]);
                    const updated = await update('Contact', inserted);
                    expect(updated).toEqual([{Id: 'Contact/z1', Count: 1}, {Id: 'Contact/z2', Count: 1}]);
                    await remove('Contact', inserted);
                    expect(removed).toEqual([{Id: 'Contact/z1', Count: 999}, {Id: 'Contact/z2', Count: 999}]);
                }

                expect(eventsResult).toEqual([
                    [ 0, 'beginTransaction',       void 0],
                    [ 1, 'beginExecute',           void 0],
                    [ 2, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [ 3, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [ 4, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [ 5, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [ 6, 'endExecute',             void 0],
                    [ 7, 'endTransaction',         void 0],

                    [ 8, 'beginTransaction',       void 0],
                    [ 9, 'beginExecute',           void 0],
                    [10, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [11, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [12, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [13, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [14, 'endExecute',             void 0],
                    [15, 'endTransaction',         void 0],

                    [16, 'beginTransaction',       void 0],
                    [17, 'beginExecute',           void 0],
                    [18, 'insert',                 void 0],
                    [19, 'endExecute',             void 0],
                    [20, 'endTransaction',         void 0],

                    [21, 'beginTransaction',       void 0],
                    [22, 'beginExecute',           void 0],
                    [23, 'update',                 void 0],
                    [24, 'endExecute',             void 0],
                    [25, 'endTransaction',         void 0],

                    [26, 'beginTransaction',       void 0],
                    [27, 'beginExecute',           void 0],
                    [28, 'remove',                 void 0],
                    [29, 'endExecute',             void 0],
                    [30, 'endTransaction',         void 0],

                    [31, 'beginTransaction',       void 0],
                    [32, 'beginExecute',           void 0],
                    [33, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [34, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [35, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [36, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [37, 'endExecute',             void 0],
                    [38, 'endTransaction',         void 0],

                    [39, 'beginTransaction',       void 0],
                    [40, 'beginExecute',           void 0],
                    [41, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [42, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [43, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [44, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [45, 'endExecute',             void 0],
                    [46, 'endTransaction',         void 0],

                    [47, 'beginTransaction',       void 0],
                    [48, 'beginExecute',           void 0],
                    [49, 'insert',                 void 0],
                    [50, 'endExecute',             void 0],
                    [51, 'endTransaction',         void 0],

                    [52, 'beginTransaction',       void 0],
                    [53, 'beginExecute',           void 0],
                    [54, 'update',                 void 0],
                    [55, 'endExecute',             void 0],
                    [56, 'endTransaction',         void 0],

                    [57, 'beginTransaction',       void 0],
                    [58, 'beginExecute',           void 0],
                    [59, 'remove',                 void 0],
                    [60, 'endExecute',             void 0],
                    [61, 'endTransaction',         void 0],
                ]);
            }
        }
    });


    it("Events without transaction + Error (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            {
                let count = 0;
                const eventsResult: Array<[number, string, string[] | undefined | null]> = [];
                let removed: any = null;

                const commands1 = build({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    relationships: relationships1 as any,
                    resolvers: {
                        query: queryResolvers1,
                        insert: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'insert', void 0]);
                                return Promise.resolve(records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                    return { ...x, Id: `Contact/z${index + 1}` };
                                }));
                            }
                        },
                        update: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'update', void 0]);
                                return Promise.reject(new Error('Error messae!!!'));
                            }
                        },
                        remove: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'remove', void 0]);
                                removed = records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                    return { ...x, Count: 999 };
                                });
                                return Promise.resolve();
                            }
                        },
                    },
                    events: {
                        beginTransaction: (evt) => {
                            eventsResult.push([count++, 'beginTransaction', evt.graphPath]);
                            return Promise.resolve();
                        },
                        endTransaction: (evt, err) => {
                            eventsResult.push([count++, err ? `endTransaction(error:${err.message})` : 'endTransaction', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beginExecute: (evt) => {
                            eventsResult.push([count++, 'beginExecute', evt.graphPath]);
                            return Promise.resolve();
                        },
                        endExecute: (evt, err) => {
                            eventsResult.push([count++, err ? `endExecute(error:${err.message})` : 'endExecute', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beforeMasterSubQueries: (evt) => {
                            eventsResult.push([count++, 'beforeMasterSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        afterMasterSubQueries: (evt) => {
                            eventsResult.push([count++, 'afterMasterSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beforeDetailSubQueries: (evt) => {
                            eventsResult.push([count++, 'beforeDetailSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        afterDetailSubQueries: (evt) => {
                            eventsResult.push([count++, 'afterDetailSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                    },
                });

                const { compile, soql, insert, update, remove, transaction } = commands1;

                for (let i = 0; i < 2; i++) {
                    try {
                        const result = await soql`
                            select
                                id, foo, bar, baz,
                                account.id, account.name,
                                (select id, name, amount from account.opportunities)
                            from contact, account`;
                        const expects = [
                            { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                            Account: { Id: 'Account/z1', Name: 'fff/z1',
                            Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                            { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                            { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                            Account: { Id: 'Account/z1', Name: 'fff/z1',
                            Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                            { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                            { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                            Account: { Id: 'Account/z2', Name: 'fff/z2',
                            Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                            { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                            { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                            Account: null },
                            { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                            Account: null },
                        ];
                        expect(result).toEqual(expects);

                        const query = compile`
                            select
                                id, foo, bar, baz,
                                account.id, account.name,
                                (select id, name, amount from account.opportunities)
                            from contact, account`;
                        const result2 = await query.execute();
                        expect(result2).toEqual(expects);

                        const inserted = await insert('Contact', [{Count: 0}, {Count: 0}] as any[]);
                        expect(inserted).toEqual([{Id: 'Contact/z1', Count: 0}, {Id: 'Contact/z2', Count: 0}]);
                        const updated = await update('Contact', inserted);
                        expect(updated).toEqual([{Id: 'Contact/z1', Count: 1}, {Id: 'Contact/z2', Count: 1}]);
                        await remove('Contact', inserted);
                        expect(removed).toEqual([{Id: 'Contact/z1', Count: 999}, {Id: 'Contact/z2', Count: 999}]);

                        expect(0).toEqual(1);
                    } catch (e) {
                        expect(1).toEqual(1);
                    }
                }

                expect(eventsResult).toEqual([
                    [ 0, 'beginTransaction',       void 0],
                    [ 1, 'beginExecute',           void 0],
                    [ 2, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [ 3, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [ 4, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [ 5, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [ 6, 'endExecute',             void 0],
                    [ 7, 'endTransaction',         void 0],

                    [ 8, 'beginTransaction',       void 0],
                    [ 9, 'beginExecute',           void 0],
                    [10, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [11, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [12, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [13, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [14, 'endExecute',             void 0],
                    [15, 'endTransaction',         void 0],

                    [16, 'beginTransaction',       void 0],
                    [17, 'beginExecute',           void 0],
                    [18, 'insert',                 void 0],
                    [19, 'endExecute',             void 0],
                    [20, 'endTransaction',         void 0],

                    [21, 'beginTransaction',       void 0],
                    [22, 'beginExecute',           void 0],
                    [23, 'update',                 void 0],
                    [24, 'endExecute(error:Error messae!!!)', void 0],
                    [25, 'endTransaction(error:Error messae!!!)', void 0],

                    [26, 'beginTransaction',       void 0],
                    [27, 'beginExecute',           void 0],
                    [28, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [29, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [30, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [31, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [32, 'endExecute',             void 0],
                    [33, 'endTransaction',         void 0],

                    [34, 'beginTransaction',       void 0],
                    [35, 'beginExecute',           void 0],
                    [36, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [37, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [38, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [39, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [40, 'endExecute',             void 0],
                    [41, 'endTransaction',         void 0],

                    [42, 'beginTransaction',       void 0],
                    [43, 'beginExecute',           void 0],
                    [44, 'insert',                 void 0],
                    [45, 'endExecute',             void 0],
                    [46, 'endTransaction',         void 0],

                    [47, 'beginTransaction',       void 0],
                    [48, 'beginExecute',           void 0],
                    [49, 'update',                 void 0],
                    [50, 'endExecute(error:Error messae!!!)', void 0],
                    [51, 'endTransaction(error:Error messae!!!)', void 0],
                ]);
            }
        }
    });


    it("Events with transaction (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            {
                let count = 0;
                const eventsResult: Array<[number, string, string[] | undefined | null]> = [];
                let removed: any = null;

                const commands1 = build({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    relationships: relationships1 as any,
                    resolvers: {
                        query: queryResolvers1,
                        insert: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'insert', void 0]);
                                return Promise.resolve(records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                    return { ...x, Id: `Contact/z${index + 1}` };
                                }));
                            }
                        },
                        update: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'update', void 0]);
                                return Promise.resolve(records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-member-access
                                    return { ...x, Count: (x as any).Count + 1 };
                                }));
                            }
                        },
                        remove: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'remove', void 0]);
                                removed = records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                    return { ...x, Count: 999 };
                                });
                                return Promise.resolve();
                            }
                        },
                    },
                    events: {
                        beginTransaction: (evt) => {
                            eventsResult.push([count++, 'beginTransaction', evt.graphPath]);
                            return Promise.resolve();
                        },
                        endTransaction: (evt, err) => {
                            eventsResult.push([count++, err ? `endTransaction(error:${err.message})` : 'endTransaction', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beginExecute: (evt) => {
                            eventsResult.push([count++, 'beginExecute', evt.graphPath]);
                            return Promise.resolve();
                        },
                        endExecute: (evt, err) => {
                            eventsResult.push([count++, err ? `endExecute(error:${err.message})` : 'endExecute', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beforeMasterSubQueries: (evt) => {
                            eventsResult.push([count++, 'beforeMasterSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        afterMasterSubQueries: (evt) => {
                            eventsResult.push([count++, 'afterMasterSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beforeDetailSubQueries: (evt) => {
                            eventsResult.push([count++, 'beforeDetailSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        afterDetailSubQueries: (evt) => {
                            eventsResult.push([count++, 'afterDetailSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                    },
                });

                const { transaction } = commands1;

                await transaction(async (commands) => {
                    const { compile, soql, insert, update, remove } = commands;
                    for (let i = 0; i < 2; i++) {
                        const result = await soql`
                            select
                                id, foo, bar, baz,
                                account.id, account.name,
                                (select id, name, amount from account.opportunities)
                            from contact, account`;
                        const expects = [
                            { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                            Account: { Id: 'Account/z1', Name: 'fff/z1',
                            Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                            { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                            { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                            Account: { Id: 'Account/z1', Name: 'fff/z1',
                            Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                            { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                            { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                            Account: { Id: 'Account/z2', Name: 'fff/z2',
                            Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                            { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                            { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                            Account: null },
                            { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                            Account: null },
                        ];
                        expect(result).toEqual(expects);

                        const query = compile`
                            select
                                id, foo, bar, baz,
                                account.id, account.name,
                                (select id, name, amount from account.opportunities)
                            from contact, account`;
                        const result2 = await query.execute();
                        expect(result2).toEqual(expects);

                        const inserted = await insert('Contact', [{Count: 0}, {Count: 0}] as any[]);
                        expect(inserted).toEqual([{Id: 'Contact/z1', Count: 0}, {Id: 'Contact/z2', Count: 0}]);
                        const updated = await update('Contact', inserted);
                        expect(updated).toEqual([{Id: 'Contact/z1', Count: 1}, {Id: 'Contact/z2', Count: 1}]);
                        await remove('Contact', inserted);
                        expect(removed).toEqual([{Id: 'Contact/z1', Count: 999}, {Id: 'Contact/z2', Count: 999}]);
                    }
                });

                expect(eventsResult).toEqual([
                    [ 0, 'beginTransaction',       void 0],

                    [ 1, 'beginExecute',           void 0],
                    [ 2, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [ 3, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [ 4, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [ 5, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [ 6, 'endExecute',             void 0],

                    [ 7, 'beginExecute',           void 0],
                    [ 8, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [ 9, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [10, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [11, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [12, 'endExecute',             void 0],

                    [13, 'beginExecute',           void 0],
                    [14, 'insert',                 void 0],
                    [15, 'endExecute',             void 0],

                    [16, 'beginExecute',           void 0],
                    [17, 'update',                 void 0],
                    [18, 'endExecute',             void 0],

                    [19, 'beginExecute',           void 0],
                    [20, 'remove',                 void 0],
                    [21, 'endExecute',             void 0],

                    [22, 'beginExecute',           void 0],
                    [23, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [24, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [25, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [26, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [27, 'endExecute',             void 0],

                    [28, 'beginExecute',           void 0],
                    [29, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [30, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [31, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [32, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [33, 'endExecute',             void 0],

                    [34, 'beginExecute',           void 0],
                    [35, 'insert',                 void 0],
                    [36, 'endExecute',             void 0],

                    [37, 'beginExecute',           void 0],
                    [38, 'update',                 void 0],
                    [39, 'endExecute',             void 0],

                    [40, 'beginExecute',           void 0],
                    [41, 'remove',                 void 0],
                    [42, 'endExecute',             void 0],

                    [43, 'endTransaction',         void 0],
                ]);
            }
        }
    });


    it("Events with transaction + Error (1)", async function() {
        for (const cf of resolverConfigs) {
            setDefaultStaticResolverConfig(cf);

            {
                let count = 0;
                const eventsResult: Array<[number, string, string[] | undefined | null]> = [];
                let removed: any = null;

                const commands1 = build({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    relationships: relationships1 as any,
                    resolvers: {
                        query: queryResolvers1,
                        insert: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'insert', void 0]);
                                return Promise.resolve(records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                    return { ...x, Id: `Contact/z${index + 1}` };
                                }));
                            }
                        },
                        update: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'update', void 0]);
                                return Promise.reject(new Error('Error messae!!!'));
                            }
                        },
                        remove: {
                            Contact: (records, ctx) => {
                                eventsResult.push([count++, 'remove', void 0]);
                                removed = records.map((x, index) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                                    return { ...x, Count: 999 };
                                });
                                return Promise.resolve();
                            }
                        },
                    },
                    events: {
                        beginTransaction: (evt) => {
                            eventsResult.push([count++, 'beginTransaction', evt.graphPath]);
                            return Promise.resolve();
                        },
                        endTransaction: (evt, err) => {
                            eventsResult.push([count++, err ? `endTransaction(error:${err.message})` : 'endTransaction', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beginExecute: (evt) => {
                            eventsResult.push([count++, 'beginExecute', evt.graphPath]);
                            return Promise.resolve();
                        },
                        endExecute: (evt, err) => {
                            eventsResult.push([count++, err ? `endExecute(error:${err.message})` : 'endExecute', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beforeMasterSubQueries: (evt) => {
                            eventsResult.push([count++, 'beforeMasterSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        afterMasterSubQueries: (evt) => {
                            eventsResult.push([count++, 'afterMasterSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        beforeDetailSubQueries: (evt) => {
                            eventsResult.push([count++, 'beforeDetailSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                        afterDetailSubQueries: (evt) => {
                            eventsResult.push([count++, 'afterDetailSubQueries', evt.graphPath]);
                            return Promise.resolve();
                        },
                    },
                });

                const { transaction } = commands1;

                try {
                    await transaction(async (commands) => {
                        const { compile, soql, insert, update, remove } = commands;
                        for (let i = 0; i < 2; i++) {
                            const result = await soql`
                                select
                                    id, foo, bar, baz,
                                    account.id, account.name,
                                    (select id, name, amount from account.opportunities)
                                from contact, account`;
                            const expects = [
                                { Id: 'Contact/z1', Foo: 'aaa/z1', Bar: 'bbb/z1', Baz: 'ccc/z1',
                                Account: { Id: 'Account/z1', Name: 'fff/z1',
                                Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                                { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                                { Id: 'Contact/z2', Foo: 'aaa/z2', Bar: 'bbb/z2', Baz: 'ccc/z2',
                                Account: { Id: 'Account/z1', Name: 'fff/z1',
                                Opportunities: [{ Id: 'Opportunity/z1', Name: 'hhh/z1', Amount: 1000 },
                                                { Id: 'Opportunity/z2', Name: 'hhh/z2', Amount: 2000 }] }},
                                { Id: 'Contact/z3', Foo: 'aaa/z3', Bar: 'bbb/z3', Baz: 'ccc/z3',
                                Account: { Id: 'Account/z2', Name: 'fff/z2',
                                Opportunities: [{ Id: 'Opportunity/z3', Name: 'hhh/z3', Amount: 3000 },
                                                { Id: 'Opportunity/z5', Name:       '', Amount:    0 }] }},
                                { Id: 'Contact/z4', Foo:     null, Bar:     null, Baz:     null,
                                Account: null },
                                { Id: 'Contact/z5', Foo:       '', Bar:       '', Baz:      ' ',
                                Account: null },
                            ];
                            expect(result).toEqual(expects);

                            const query = compile`
                                select
                                    id, foo, bar, baz,
                                    account.id, account.name,
                                    (select id, name, amount from account.opportunities)
                                from contact, account`;
                            const result2 = await query.execute();
                            expect(result2).toEqual(expects);

                            const inserted = await insert('Contact', [{Count: 0}, {Count: 0}] as any[]);
                            expect(inserted).toEqual([{Id: 'Contact/z1', Count: 0}, {Id: 'Contact/z2', Count: 0}]);
                            const updated = await update('Contact', inserted);
                            expect(updated).toEqual([{Id: 'Contact/z1', Count: 1}, {Id: 'Contact/z2', Count: 1}]);
                            await remove('Contact', inserted);
                            expect(removed).toEqual([{Id: 'Contact/z1', Count: 999}, {Id: 'Contact/z2', Count: 999}]);
                        }
                    });
                    expect(0).toEqual(1);
                } catch (e) {
                    expect(1).toEqual(1);
                }

                expect(eventsResult).toEqual([
                    [ 0, 'beginTransaction',       void 0],

                    [ 1, 'beginExecute',           void 0],
                    [ 2, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [ 3, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [ 4, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [ 5, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [ 6, 'endExecute',             void 0],

                    [ 7, 'beginExecute',           void 0],
                    [ 8, 'beforeMasterSubQueries', ['Contact', 'Account']],
                    [ 9, 'afterMasterSubQueries',  ['Contact', 'Account']],
                    [10, 'beforeDetailSubQueries', ['Contact', 'Account', 'Opportunities']],
                    [11, 'afterDetailSubQueries',  ['Contact', 'Account', 'Opportunities']],
                    [12, 'endExecute',             void 0],

                    [13, 'beginExecute',           void 0],
                    [14, 'insert',                 void 0],
                    [15, 'endExecute',             void 0],

                    [16, 'beginExecute',           void 0],
                    [17, 'update',                 void 0],
                    [18, 'endExecute(error:Error messae!!!)', void 0],

                    [19, 'endTransaction(error:Error messae!!!)', void 0],
                ]);
            }
        }
    });
});
