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


describe("field-cond-1", function() {
    it("Id field condition (1)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' and testspec_pass_thru(foo)>'')
                or (id>'' and bar>'')
                or (baz>'' and qux>'')
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id > ''");
    });

    it("Id field condition (2)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' and testspec_pass_thru(foo)>'')
                or not (id>'' and bar>'')
                or (baz>'' and qux>'')
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'not',
            operands: [{
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, ''],
            }]
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("(not id > '')");
    });

    it("Id field condition (3)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' and testspec_pass_thru(foo)>'')
                or (id>'' and bar>'')
                or (baz>'' and qux>'')
                or (quux > '' and id>'' and bar>'')
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'or',
            operands: [{
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, ''],
            }, {
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, ''],
            }]
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("(id > '' or id > '')");
    });

    it("Id field condition (4)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' and testspec_pass_thru(foo)>'')
                or not (id>'' and bar>'')
                or (baz>'' and qux>'')
                or (quux > '' and id>'' and bar>'')
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id']);
        expect(condId).toEqual([{
            type: 'condition',
            op: 'or',
            operands: [{
                type: 'condition',
                op: 'not',
                operands: [{
                    type: 'condition',
                    op: '>',
                    operands: [{
                        type: 'field',
                        name: ['id'],
                    }, ''],
                }]
            }, {
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, ''],
            }],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("((not id > '') or id > '')");
    });

    it("Id field condition (5)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' and testspec_pass_thru(foo)>'')
                and (id>'' and bar>'')
                and (baz>'' and qux>'')
                and (quux > '' and id>'' and bar>'')
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id > '' and id > ''");
    });

    it("Id field condition (6)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' and testspec_pass_thru(foo)>'')
                and (id>'' and bar>'')
                and (baz>'' and qux>'')
                and (quux > '' and (id>'' and bar>'' and corge>''))
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'Corge']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['corge'],
            }, ''],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id > '' and id > '' and corge > ''");
    });

    it("Id field condition (7)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id>'' or bar>'')
                and (baz>'' or qux>'')
                and (quux > '' or id>'' or bar>'')
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id > '' and id > ''");
    });

    it("Id field condition (8)", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id>'' or bar>'')
                and (baz>'' or qux>'')
                and (quux > '' or id>'' or bar>'')
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: 'or',
            operands: [{
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['quux'],
                }, ''],
            }, {
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, ''],
            }],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id > '' and (quux > '' or id > '')");
    });

    it("Id field condition (9): parameters", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id>'' or bar>'')
                and (baz>'' or qux>'')
                and (quux > '' or id>:qwerty or bar>'')
            `, []);

        const ctx = {
            params: {
                qwerty: 'a'
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: 'or',
            operands: [{
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['quux'],
                }, ''],
            }, {
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, 'a'],
            }],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id > '' and (quux > '' or id > 'a')");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: 'or',
            operands: [{
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['quux'],
                }, ''],
            }, {
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, {
                    type: 'parameter',  // <- use parameter
                    name: 'qwerty',
                }],
            }],
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual("id > '' and (quux > '' or id > 'a')");
    });

    it("Id field condition (10): fncall", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id>'' or bar>'')
                and (baz>'' or qux>'')
                and (quux > '' or id>testspec_pass_thru('a') or bar>'')
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['quux'],
            }, ''],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id > '' and quux > ''");
    });

    it("Id field condition (11): in", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id>'' or bar>'')
                and (baz>'' or qux>'')
                and (quux > '' or id in ('a','s','d','f', -100, true, false, null, :qwerty, 2020-12-31, 2020-12-31T00:00:01Z) or bar>'')
            `, []);

        const ctx = {
            params: {
                qwerty: 'zzzz'
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: 'or',
            operands: [{
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['quux'],
                }, ''],
            }, {
                type: 'condition',
                op: 'in',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, [
                    'a', 's', 'd', 'f',
                    -100, true, false, null, 'zzzz',
                    {type: 'date', value: '2020-12-31'}, {type: 'datetime', value: '2020-12-31T00:00:01Z'},
                ]],
            }],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual(
            "id > '' and (quux > '' or id in ('a','s','d','f',-100,true,false,null,'zzzz','2020-12-31','2020-12-31T00:00:01Z'))");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: 'or',
            operands: [{
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['quux'],
                }, ''],
            }, {
                type: 'condition',
                op: 'in',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, [
                    'a', 's', 'd', 'f',
                    -100, true, false, null, {type: 'parameter', name: 'qwerty'},  // <- use parameter
                    {type: 'date', value: '2020-12-31'}, {type: 'datetime', value: '2020-12-31T00:00:01Z'},
                ]],
            }],
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual(
            "id > '' and (quux > '' or id in ('a','s','d','f',-100,true,false,null,'zzzz','2020-12-31','2020-12-31T00:00:01Z'))");
    });

    it("Id field condition (11b): in", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id>'' or bar>'')
                and (baz>'' or qux>'')
                and (quux > '' or id in :qwerty or bar>'')
            `, []);

        const ctx: Pick<ResolverContext, 'params'> = {
            params: {
                qwerty: [
                    'a', 's', 'd', 'f',
                    -100, true, false, null, 'zzzz',
                    {type: 'date', value: '2020-12-31'}, {type: 'datetime', value: '2020-12-31T00:00:01Z'},
                ]
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: 'or',
            operands: [{
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['quux'],
                }, ''],
            }, {
                type: 'condition',
                op: 'in',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, [
                    'a', 's', 'd', 'f',
                    -100, true, false, null, 'zzzz',
                    {type: 'date', value: '2020-12-31'}, {type: 'datetime', value: '2020-12-31T00:00:01Z'},
                ]],
            }],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual(
            "id > '' and (quux > '' or id in ('a','s','d','f',-100,true,false,null,'zzzz','2020-12-31','2020-12-31T00:00:01Z'))");

        const condId2: PreparedCondition[] = [{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: 'or',
            operands: [{
                type: 'condition',
                op: '>',
                operands: [{
                    type: 'field',
                    name: ['quux'],
                }, ''],
            }, {
                type: 'condition',
                op: 'in',
                operands: [{
                    type: 'field',
                    name: ['id'],
                }, {type: 'parameter', name: 'qwerty'}],  // <- use parameter
            }],
        }];
        expect(getSqlConditionString(ctx, condId2, dialect)).toEqual(
            "id > '' and (quux > '' or id in ('a','s','d','f',-100,true,false,null,'zzzz','2020-12-31','2020-12-31T00:00:01Z'))");
    });

    it("Id field condition (12): in subquery", function() {
        const query = prepareQuery(builder, `
            Select id
            from contact
            where
                (testspec_pass_thru(id)>'' or testspec_pass_thru(foo)>'')
                and (id>'' or bar>'')
                and (baz>'' or qux>'')
                and (quux > '' or id in (select whatid from event) or bar>'')
            `, []);

        const ctx = {
            params: {
                //
            },
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const condWhere = deepCloneObject(query.where!)
            .map(cond => pruneCondition(query.from[0].name, cond))
            .filter(filterZeroLengthCondFn);

        const condId = getIndexFieldConditions(ctx, condWhere, ['Id', 'QUUX']);
        expect(condId).toEqual([{
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['id'],
            }, ''],
        }, {
            type: 'condition',
            op: '>',
            operands: [{
                type: 'field',
                name: ['quux'],
            }, ''],
        }]);

        const dialect: SqlDialect = {
            escapeString: escapeSqlStringLiteral_Std,
            fieldName: s => s,
        };
        expect(getSqlConditionString(ctx, condId, dialect)).toEqual("id > '' and quux > ''");
    });
});
