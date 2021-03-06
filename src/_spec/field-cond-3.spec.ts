// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { prepareQuery,
         prepareBuilderInfo }       from '../lib/prepare';
import { deepCloneObject }          from '../lib/util';
import { ResolverContext,
         PreparedCondition,
         SqlDialect }               from '../types';
import { staticCsvResolverBuilder } from '../resolvers';
import { filterZeroLengthCondFn,
         pruneCondition }           from '../lib/condition';
import { getIndexFieldConditions,
         getSqlConditionString,
         escapeSqlStringLiteral_Std,
         escapeSqlStringLiteral_MySql } from '../filters';



const postfix = 0;

const builder = prepareBuilderInfo({
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
    }, {
        type: 'aggregate',
        name: 'testspec_agg_pass_thru',
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
                    Id         , Foo      , Bar      , Baz      , Qux      , Quux     ,   Corge , Grault       , Garply                 , AccountId
                    Contact/z1 , aaa/z1   , bbb/z1   , ccc/z1   , ddd/z1   , eee/z1   ,    -1.0 , 2019-12-31   , 2019-12-31T23:59:59Z   , Account/z1
                    Contact/z2 , aaa/z2   , bbb/z2   , ccc/z2   , ddd/z2   , eee/z2   ,     0.0 , 2020-01-01   , 2020-01-01T00:00:00Z   , Account/z1
                    Contact/z3 , "aaa/z3" , "bbb/z3" , "ccc/z3" , "ddd/z3" , "eee/z3" ,     1   , "2020-01-02" , "2020-01-01T00:00:01Z" , "Account/z2"
                    Contact/z4 ,          ,          ,          ,          ,          ,         ,              ,                        ,
                    Contact/z5 ,       "" ,       "" ,      " " ,       "" ,       "" ,         ,              ,                        ,
                `)
            ),
            Account: (fields, conditions, limit, offset, ctx) => {
                let data = [
                    { Id: 'Account/z1', Name: `fff/z1-${postfix}`, Address: `ggg/z1-${postfix}` },
                    { Id: 'Account/z2', Name: `fff/z2-${postfix}`, Address: `ggg/z2-${postfix}` },
                    { Id: 'Account/z3', Name: `fff/z3-${postfix}`, Address: `ggg/z3-${postfix}` },
                    { Id: 'Account/z4', Name: null    , Address: null     },
                    { Id: 'Account/z5', Name: ''      , Address: ''       },
                ];
                if (ctx.parent && ctx.parentType === 'detail') {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
                    data = data.filter(x => x.Id === (ctx.parent as any)[ctx.foreignIdField!]);
                }
                return Promise.resolve(data);
            },
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


describe("field-cond-3", function() {
    it("Id field condition (14-1): param types (array - string)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id in (:qwerty) or bar>'')
                and (baz>'' or qux>'')
            `, []);

        const ctx: Pick<ResolverContext, 'params'> = {
            params: {
                qwerty: '',
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ['']],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id in ('')");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [{type: 'parameter', name: 'qwerty'}]], // <- use parameter
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual("id in ('')");
    });

    it("Id field condition (14-2): param types (array - number)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id in (:qwerty) or bar>'')
                and (baz>'' or qux>'')
            `, []);

        const ctx: Pick<ResolverContext, 'params'> = {
            params: {
                qwerty: -100,
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [-100]],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id in (-100)");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [{type: 'parameter', name: 'qwerty'}]], // <- use parameter
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual("id in (-100)");
    });

    it("Id field condition (14-3): param types (array - boolean)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id in (:qwerty) or bar>'')
                and (baz>'' or qux>'')
            `, []);

        const ctx: Pick<ResolverContext, 'params'> = {
            params: {
                qwerty: false,
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [false]],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id in (false)");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [{type: 'parameter', name: 'qwerty'}]], // <- use parameter
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual("id in (false)");
    });

    it("Id field condition (14-4): param types (array - date)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id in (:qwerty) or bar>'')
                and (baz>'' or qux>'')
            `, []);

        const ctx: Pick<ResolverContext, 'params'> = {
            params: {
                qwerty: {type: 'date', value: '2020-12-31'},
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [{type: 'date', value: '2020-12-31'}]],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id in ('2020-12-31')");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [{type: 'parameter', name: 'qwerty'}]], // <- use parameter
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual("id in ('2020-12-31')");
    });

    it("Id field condition (14-5): param types (array - datetime)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id in (:qwerty) or bar>'')
                and (baz>'' or qux>'')
            `, []);

        const ctx: Pick<ResolverContext, 'params'> = {
            params: {
                qwerty: {type: 'datetime', value: '2020-12-31T01:02:03Z'},
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [{type: 'datetime', value: '2020-12-31T01:02:03Z'}]],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id in ('2020-12-31T01:02:03Z')");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [{type: 'parameter', name: 'qwerty'}]], // <- use parameter
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual("id in ('2020-12-31T01:02:03Z')");
    });

    it("Id field condition (14-6): param types (array - null)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id in (:qwerty) or bar>'')
                and (baz>'' or qux>'')
            `, []);

        const ctx: Pick<ResolverContext, 'params'> = {
            params: {
                qwerty: null,
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [null]],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id in (null)");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [{type: 'parameter', name: 'qwerty'}]], // <- use parameter
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual("id in (null)");
    });

    it("Id field condition (14-7): param types (array - 'null')", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id in (:qwerty) or bar>'')
                and (baz>'' or qux>'')
            `, []);

        const ctx: Pick<ResolverContext, 'params'> = {
            params: {
                qwerty: 'null',
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ['null']],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id in ('null')");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: 'in',
            operands: [{
                type: 'field',
                name: ['id'],
            }, [{type: 'parameter', name: 'qwerty'}]], // <- use parameter
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual("id in ('null')");
    });
});
