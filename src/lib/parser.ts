// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { parserInput,
         templateStringsParserInput } from 'fruitsconfits/modules/lib/types';
import { formatErrorMessage }         from 'fruitsconfits/modules/lib/parser';
import { getStringParsers }           from 'fruitsconfits/modules/lib/string-parser';
import { getObjectParsers }           from 'fruitsconfits/modules/lib/object-parser';
import { PreparedValue,
         PreparedFieldListItem,
         PreparedResolver,
         PreparedCondition,
         PreparedOrderByField,
         PreparedQuery }              from '../types';
import { DatePattern,
         DateTimePattern,
         dummyTargetObject,
         isUnsafeVarNames }           from './util';



interface SxOp {
    'op': string;
}

interface SxSymbol {
    'symbol': string;
}

interface SxObject {
    'type': /* string */ any;
}

interface SxName {
    'name': /* string */ any[];
}

type SxToken =
    SxSymbol | SxObject | SxName |
    PreparedValue | PreparedFieldListItem | PreparedResolver |
    PreparedCondition | PreparedOrderByField | Partial<PreparedQuery> |
    string | number | boolean | null | SxToken[];

type Ast = SxToken | SxOp | undefined | Ast[];


// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Ctx {}


const $s = getStringParsers<Ctx, Ast>({
    rawToToken: rawToken => rawToken,
    concatTokens: tokens => (tokens.length ?
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        [tokens.reduce((a, b) => String(a) + b)] : []),
});

const $o = getObjectParsers<Ast[], Ctx, Ast>({
    rawToToken: rawToken => rawToken,
    concatTokens: tokens => (tokens.length ?
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        [tokens.reduce((a, b) => String(a) + b)] : []),
    comparator: (a, b) => a === b,
});

const {seq, cls, notCls, clsFn, classes, numbers, isParam, cat,
       once, repeat, qty, zeroWidth, err, beginning, end,
       first, or, combine, erase, trans, ahead, rules,
       makeProgram} = $s;

const seqI = (x: string) => clsFn(c => c.slice(0, x.length).toLocaleLowerCase() === x ? x.length : -1);


const unaryOp = (op: string, op1: any) => {
    return {type: 'condition', op, operands: [op1]};
};

const binaryOp = (op: string, op1: any, op2: any) => {
    return {type: 'condition', op, operands: [op1, op2]};
};

const isOperator = (v: any, op: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof v === 'object' && v.op === op) {
        return true;
    }
    return false;
};

const isValue = (v: any) => {
    // TODO: check type
    return true;
};


const lineComment =
    combine(
        erase(qty(2)(cls('-'))),
        first(
            combine(
                repeat(notCls('\r\n', '\n', '\r')),
                first(classes.newline, ahead(end())), ),
            first(classes.newline, ahead(end())), ));

const blockComment =
    combine(
        seq('/*'),
            repeat(notCls('*/')),
            seq('*/'), );

const commentOrSpace =
    first(classes.space, lineComment, blockComment);


const reservedKeywords =
    first(
        combine(seqI('select'), input => wordBoundary(input)),
        combine(seqI('from'), input => wordBoundary(input)),
        combine(seqI('where'), input => wordBoundary(input)),
        cat(combine(seqI('order'), erase(qty(1)(commentOrSpace)), seqI('by'))),
        cat(combine(seqI('group'), erase(qty(1)(commentOrSpace)), seqI('by'))),
        combine(seqI('having'), input => wordBoundary(input)), );

const notAheadReservedKeywords =
    ahead(input => {
        const result = combine(
            reservedKeywords,
            first(
                qty(1)(commentOrSpace),
                cls('(', ')', "'", '"', '=', '!', '<', '>'),
                end(), ))(input);
        if (result.succeeded) {
            return ({
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: 'Unexpected reserved keyword aheads',
            });
        } else {
            return ({
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start,
                    end: input.end,
                    context: input.context,
                },
                tokens: [],
            });
        }
    });


const isWord = (s: string) => {
    if (typeof s !== 'string') {
        return false;
    }
    return /^[A-Za-z0-9$_"]$/.test(s);
}


const wordBoundary =
    ahead(input => {
        let w = false;
        if (input.start === input.end) {
            w = false;
        } else if (input.start === 0) {
            w = isWord(input.src[input.start]);
        } else if (input.start === input.end - 1) {
            w = isWord(input.src[input.start]);
        } else {
            w = (!isWord(input.src[input.start - 1]) && isWord(input.src[input.start])) ||
                (isWord(input.src[input.start - 1]) && !isWord(input.src[input.start]));
        }
        if (w) {
            return ({
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start,
                    end: input.end,
                    context: input.context,
                },
                tokens: [],
            });
        } else {
            return ({
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: 'Expect word break',
            });
        }
    });


const trueValue =
    trans(tokens => [true])
    (seqI('true'), wordBoundary);

const falseValue =
    trans(tokens => [false])
    (seqI('false'), wordBoundary);

const nullValue =
    trans(tokens => [null])
    (seqI('null'), wordBoundary);

const positiveInfinityValue =
    trans(tokens => [Number.POSITIVE_INFINITY])
    (qty(0, 1)(seq('+')), seq('Infinity'), wordBoundary);

const negativeInfinityValue =
    trans(tokens => [Number.NEGATIVE_INFINITY])
    (seq('-Infinity'), wordBoundary);

const nanValue =
    trans(tokens => [Number.NaN])
    (seq('NaN'), wordBoundary);


const binaryIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 2)])
    (numbers.bin(seq('0b')));

const octalIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 8)])
    (numbers.oct(seq('0o'), seq('0')));

const hexIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 16)])
    (numbers.hex(seq('0x'), seq('0X')));

const decimalIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 10)])
    (numbers.int);

const floatingPointNumberValue =
    trans(tokens => [Number.parseFloat((tokens as string[])[0].replace(/_/g, ''))])
    (numbers.float);

const numberValue =
    first(octalIntegerValue,
          hexIntegerValue,
          binaryIntegerValue,
          floatingPointNumberValue,
          decimalIntegerValue,
          positiveInfinityValue,
          negativeInfinityValue,
          nanValue, );


const stringEscapeSeq = first(
    trans(t => ['\''])(seq('\\\'')),
    trans(t => ['\"'])(seq('\\"')),
    trans(t => ['\`'])(seq('\\`')),
    trans(t => ['/'])(seq('\\/')),
    trans(t => ['\\'])(seq('\\\\')),
    trans(t => [''])(seq('\\\r\n')),
    trans(t => [''])(seq('\\\r')),
    trans(t => [''])(seq('\\\n')),
    trans(t => ['\n'])(seq('\\n')),
    trans(t => ['\n'])(seq('\\N')),
    trans(t => ['\r'])(seq('\\r')),
    trans(t => ['\r'])(seq('\\R')),
    trans(t => ['\v'])(seq('\\v')),
    trans(t => ['\t'])(seq('\\t')),
    trans(t => ['\t'])(seq('\\T')),
    trans(t => ['\b'])(seq('\\b')),
    trans(t => ['\b'])(seq('\\B')),
    trans(t => ['\f'])(seq('\\f')),
    trans(t => ['\f'])(seq('\\F')),
    trans(t => [String.fromCodePoint(Number.parseInt((t as string[])[0], 16))])(
        cat(erase(seq('\\u')),
                qty(4, 4)(classes.hex), )),
    trans(t => [String.fromCodePoint(Number.parseInt((t as string[])[0], 16))])(
        cat(erase(seq('\\u{')),
                qty(1, 6)(classes.hex),
                erase(seq('}')), )),
    trans(t => [String.fromCodePoint(Number.parseInt((t as string[])[0], 16))])(
        cat(erase(seq('\\x')),
                qty(2, 2)(classes.hex), )),
    trans(t => [String.fromCodePoint(Number.parseInt((t as string[])[0], 8))])(
        cat(erase(seq('\\')),
                qty(3, 3)(classes.oct), )));

const stringValue =
    trans(tokens => [tokens[0] ?? ''])(
        erase(seq("'")),
            cat(repeat(first(
                stringEscapeSeq,
                combine(cls('\r', '\n'), err('Line breaks within strings are not allowed.')),
                notCls("'"),
            ))),
        erase(seq("'")), );


const dateValue =
    trans(tokens => [{type: 'date', value: tokens[0]}])(cat(
        qty(4, 4)(classes.num),
        cls('-'),
        qty(2, 2)(classes.num),
        cls('-'),
        qty(2, 2)(classes.num), ));


const dateTimeValue =
    trans(tokens => [{type: 'datetime', value: tokens[0]}])(cat(
        qty(4, 4)(classes.num),
        cls('-'),
        qty(2, 2)(classes.num),
        cls('-'),
        qty(2, 2)(classes.num),
        cls('T'),
        qty(2, 2)(classes.num),
        cls(':'),
        qty(2, 2)(classes.num),
        qty(0, 1)(combine(
            cls(':'),
            qty(2, 2)(classes.num), )),
        first(
            cls('Z'),
            combine(
                first(cls('+'), cls('-')),
                qty(2, 2)(classes.num),
                cls(':'),
                qty(2, 2)(classes.num), ))));


const literalValue =
    first(
        isParam(o => {
            switch (typeof o) {
            case 'number': case 'string': case 'boolean':
                return true;
            case 'object':
                if (o === null) {
                    return true;
                }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if ((o as any).type) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    switch ((o as any).type) {
                    case 'date':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        if (typeof (o as any).value === 'string') {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            return DatePattern.test((o as any).value);
                        }
                        break;
                    case 'datetime':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        if (typeof (o as any).value === 'string') {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            return DateTimePattern.test((o as any).value);
                        }
                        break;
                    }
                }
                break;
            }
            return false;
        }),
        dateTimeValue,
        dateValue,
        numberValue,
        stringValue,
        trueValue,
        falseValue,
        nullValue, );


const symbolStringValue =
    trans(tokens => {
        const sym = tokens[0] ?? '';
        if (isUnsafeVarNames(dummyTargetObject, sym as string)) {
            throw new Error(`Unsafe symbol name is appeared: ${sym as string}`);
        }
        return [sym];
    })(
        erase(seq('"')),
            cat(repeat(first(
                stringEscapeSeq,
                combine(cls('\r', '\n'), err('Line breaks within strings are not allowed.')),
                notCls('"'),
            ))),
        erase(seq('"')), );


const symbolName =
    trans(tokens => {
        if (isUnsafeVarNames(dummyTargetObject, tokens[0] as string)) {
            throw new Error(`Unsafe symbol name is appeared: ${tokens[0] as string}`);
        }
        return tokens;
    })(cat(combine(
        first(classes.alpha, cls('$', '_')),
        repeat(first(classes.alnum, cls('$', '_'))), )));


const complexSymbolName =
    trans(tokens => [{name: tokens}])(
        first(symbolName, symbolStringValue),
        repeat(combine(
            erase(repeat(commentOrSpace),
                  cls('.'),
                  repeat(commentOrSpace), ),
            first(symbolName, symbolStringValue), )));


const selectFieldFunctionCall =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{fn: tokens[0], args: tokens.slice(1)} as any])(
        symbolName,
        erase(repeat(commentOrSpace)),
        erase(cls('(')),
        erase(repeat(commentOrSpace)),
        repeat(first(
            literalValue,
            // eslint-disable-next-line @typescript-eslint/ban-types
            trans(tokens => [{type: 'field', ...(tokens[0] as object)}])(
                complexSymbolName, ))),
        repeat(combine(
            erase(repeat(commentOrSpace)),
            erase(cls(',')),
            erase(repeat(commentOrSpace)),
            first(
                literalValue,
                // eslint-disable-next-line @typescript-eslint/ban-types
                trans(tokens => [{type: 'field', ...(tokens[0] as object)}])(
                    complexSymbolName, )))),
        erase(repeat(commentOrSpace)),
        erase(cls(')')), );


// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const subQuery = trans(tokens => [{query: tokens[0]} as any])(
    erase(cls('('),
          repeat(commentOrSpace), ),
    input => selectStatement(input),
    erase(repeat(commentOrSpace),
          cls(')'), ));


const listValue = trans(tokens => [tokens])(
    erase(cls('('),
          repeat(commentOrSpace), ),
    literalValue,
    erase(repeat(commentOrSpace)),
    repeat(combine(
        erase(cls(','),
              repeat(commentOrSpace), ),
        literalValue,
    )),
    erase(repeat(commentOrSpace),
          cls(')'), ));


const complexSelectFieldName =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{
            // eslint-disable-next-line @typescript-eslint/ban-types
            ...(tokens[0] as object),
            // eslint-disable-next-line @typescript-eslint/ban-types
            ...{aliasName: (tokens.length > 1 ? tokens[1] as object : null)}} as any])(
        notAheadReservedKeywords,
        first(
            // eslint-disable-next-line @typescript-eslint/ban-types
            trans(tokens => [{type: 'fncall', ...(tokens[0] as object)}])(
                selectFieldFunctionCall, ),
            // eslint-disable-next-line @typescript-eslint/ban-types
            trans(tokens => [{type: 'field', ...(tokens[0] as object)}])(
                complexSymbolName, ),
            // eslint-disable-next-line @typescript-eslint/ban-types
            trans(tokens => [{type: 'subquery', ...(tokens[0] as object)}])(
                subQuery, )),
        first(
            combine(
                erase(repeat(commentOrSpace)), // TODO:
                notAheadReservedKeywords,
                symbolName, ),
            zeroWidth(() => null), ));


const selectFieldList =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{select: tokens} as any])(
        complexSelectFieldName,
        erase(repeat(commentOrSpace)),
        repeat(combine(
            erase(cls(',')),
            erase(repeat(commentOrSpace)),
            complexSelectFieldName,
            erase(repeat(commentOrSpace)), )));


const fromClause =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{from: tokens} as any])(
        erase(seqI('from')),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/ban-types
        trans(tokens => [{...(tokens[0] as object), aliasName: tokens[1] ?? null} as any])(
            erase(qty(1)(commentOrSpace)),
            notAheadReservedKeywords,
            complexSymbolName,
            qty(0, 1)(combine(
                erase(qty(1)(commentOrSpace)),
                notAheadReservedKeywords,
                symbolName, ))),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/ban-types
        repeat(trans(tokens => [{...(tokens[0] as object), aliasName: tokens[1] ?? null} as any])(
            erase(repeat(commentOrSpace),
                  cls(','),
                  repeat(commentOrSpace), ),
            notAheadReservedKeywords,
            complexSymbolName,
            first(
                combine(
                    erase(qty(1)(commentOrSpace)),
                    notAheadReservedKeywords,
                    symbolName, ),
                zeroWidth(() => null), ))));


const conditionalOperator =
    first(seq('='),
          seq('!='),
          seq('<'),
          seq('<='),
          seq('>'),
          seq('>='),
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          trans(tokens => [`${tokens[0]}_${tokens[1]}`])(
              seqI('not'),
                  erase(qty(1)(commentOrSpace)),
                  first(seqI('like'), seqI('in')),
                  erase(wordBoundary, repeat(commentOrSpace)), ),
          combine(seqI('like'),
                  erase(wordBoundary, repeat(commentOrSpace)), ),
          combine(seqI('in'),
                  erase(wordBoundary, repeat(commentOrSpace)), ),
          combine(seqI('includes'),
                  erase(wordBoundary, repeat(commentOrSpace)), ),
          combine(seqI('excludes'),
                  erase(wordBoundary, repeat(commentOrSpace)), ));


// production rules:
//   S -> S "not" S
const conditionExpressionExprRule3 = $o.trans(tokens => [unaryOp('not', tokens[1])])(
    $o.clsFn(t => isOperator(t, 'not')),
    $o.clsFn(t => isValue(t)),
);

// production rules:
//   S -> S "and" S
const conditionExpressionExprRule2 = $o.trans(tokens => [binaryOp('and', tokens[0], tokens[2])])(
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, 'and')),
    $o.clsFn(t => isValue(t)),
);

// production rules:
//   S -> S "or" S
const conditionExpressionExprRule1 = $o.trans(tokens => [binaryOp('or', tokens[0], tokens[2])])(
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, 'or')),
    $o.clsFn(t => isValue(t)),
);


const whereFieldExpression =
    trans(tokens => [{
            type: 'condition',
            op: tokens[1],
            operands: tokens.slice(0, 1).concat(tokens.slice(2))}])(
        notAheadReservedKeywords,
        first(
            // eslint-disable-next-line @typescript-eslint/ban-types
            trans(tokens => [{type: 'fncall', ...(tokens[0] as object)}])(
                selectFieldFunctionCall, ),
            // eslint-disable-next-line @typescript-eslint/ban-types
            trans(tokens => [{type: 'field', ...(tokens[0] as object)}])(
                complexSymbolName, )),
        erase(repeat(commentOrSpace)),
        conditionalOperator,
        erase(repeat(commentOrSpace)),
        first(literalValue,
              // eslint-disable-next-line @typescript-eslint/ban-types
              trans(tokens => [{type: 'subquery', ...(tokens[0] as object)}])(
                  subQuery, ),
              // eslint-disable-next-line @typescript-eslint/ban-types
              trans(tokens => [{type: 'fncall', ...(tokens[0] as object)}])(
                  selectFieldFunctionCall, ),
              listValue, ));


const whereConditionExpressionInnerRoot =
    trans(tokens => tokens)(
        qty(0, 1)(combine(
            trans(tokens => [{op: tokens[0]} as Ast])(seqI('not')),
            erase(wordBoundary, repeat(commentOrSpace)), )),
        first(
            trans(tokens => tokens)(
                erase(repeat(commentOrSpace)),
                erase(cls('(')),
                erase(repeat(commentOrSpace)),
                input => whereConditionExpression(input),
                erase(repeat(commentOrSpace)),
                erase(cls(')')), ),
            whereFieldExpression, ),
        repeat(combine(
            erase(repeat(commentOrSpace)),
            trans(tokens => [{op: tokens[0]} as Ast])(first(seqI('and'), seqI('or'))),
            erase(wordBoundary, repeat(commentOrSpace)),
            input => whereConditionExpression(input), )));


const whereConditionExpression = rules({
    rules: [
        conditionExpressionExprRule3,
        conditionExpressionExprRule2,
        conditionExpressionExprRule1,
    ],
    check: $o.combine($o.classes.any, $o.end()),
})(trans(tokens => tokens)(whereConditionExpressionInnerRoot));


const whereClause =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{where: [tokens[0]]} as any])(
        erase(repeat(commentOrSpace), wordBoundary),
        erase(seqI('where')),
        erase(first(ahead(cls('(')),
                    qty(1)(commentOrSpace),
                    combine(repeat(commentOrSpace), wordBoundary), )),
        whereConditionExpression, );


const groupByClause =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{groupBy: tokens} as any])(
        erase(repeat(commentOrSpace), wordBoundary),
        erase(seqI('group'),
              qty(1)(commentOrSpace),
              seqI('by'),
              qty(1)(commentOrSpace), ),
        symbolName,
        repeat(combine(
            erase(repeat(commentOrSpace),
                  cls(','),
                  repeat(commentOrSpace), ),
            symbolName, )));


const havingFieldExpression =
    trans(tokens => [{
            type: 'condition',
            op: tokens[1],
            operands: tokens.slice(0, 1).concat(tokens.slice(2))}])(
        notAheadReservedKeywords,
        // eslint-disable-next-line @typescript-eslint/ban-types
        trans(tokens => [{type: 'fncall', ...(tokens[0] as object)}])(
            selectFieldFunctionCall, ),
        erase(repeat(commentOrSpace)),
        conditionalOperator,
        erase(repeat(commentOrSpace)),
        first(literalValue,
              // eslint-disable-next-line @typescript-eslint/ban-types
              trans(tokens => [{type: 'subquery', ...(tokens[0] as object)}])(
                  subQuery,
              // eslint-disable-next-line @typescript-eslint/ban-types
              trans(tokens => [{type: 'fncall', ...(tokens[0] as object)}])(
                  selectFieldFunctionCall, ),
              listValue, )));


const havingConditionExpressionInnerRoot =
    trans(tokens => tokens)(
        qty(0, 1)(combine(
            trans(tokens => [{op: tokens[0]} as Ast])(seqI('not')),
            erase(wordBoundary, repeat(commentOrSpace)), )),
        first(
            trans(tokens => tokens)(
                erase(repeat(commentOrSpace)),
                erase(cls('(')),
                erase(repeat(commentOrSpace)),
                input => havingConditionExpression(input),
                erase(repeat(commentOrSpace)),
                erase(cls(')')), ),
            havingFieldExpression, ),
        repeat(combine(
            erase(repeat(commentOrSpace)),
            trans(tokens => [{op: tokens[0]} as Ast])(first(seqI('and'), seqI('or'))),
            erase(wordBoundary, repeat(commentOrSpace)),
            input => havingConditionExpression(input), )));


const havingConditionExpression = rules({
    rules: [
        conditionExpressionExprRule3,
        conditionExpressionExprRule2,
        conditionExpressionExprRule1,
    ],
    check: $o.combine($o.classes.any, $o.end()),
})(trans(tokens => tokens)(havingConditionExpressionInnerRoot));


const havingClause =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{having: [tokens[0]]} as any])(
        erase(repeat(commentOrSpace), wordBoundary),
        erase(seqI('having')),
        erase(first(ahead(cls('(')),
                    qty(1)(commentOrSpace),
                    combine(repeat(commentOrSpace), wordBoundary), )),
        havingConditionExpression, );


const orderByDirection =
    first(
        qty(1, 1)(combine(
            erase(qty(1)(commentOrSpace)),
            trans(tokens => [(tokens[0] as string).toLowerCase()])(first(seqI('asc'), seqI('desc'))),
            erase(wordBoundary), )),
        zeroWidth(() => 'asc'), );


const orderByNulls =
    first(
        qty(1, 1)(combine(
            erase(qty(1)(commentOrSpace),
                seqI('nulls'),
                qty(1)(commentOrSpace), ),
            trans(tokens => [(tokens[0] as string).toLowerCase()])(first(seqI('first'), seqI('last'))),
            erase(wordBoundary), )),
        zeroWidth(() => 'first'), );


const orderByClause =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{orderBy: tokens} as any])(
        erase(repeat(commentOrSpace), wordBoundary),
        erase(seqI('order'),
              qty(1)(commentOrSpace),
              seqI('by'),
              qty(1)(commentOrSpace), ),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/ban-types
        trans(tokens => [{...(tokens[0] as object), direction: tokens[1], nulls: tokens[2]} as any])(
            complexSymbolName,
            orderByDirection,
            orderByNulls, ),
        repeat(combine(
            erase(repeat(commentOrSpace),
                  cls(','),
                  repeat(commentOrSpace), ),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/ban-types
            trans(tokens => [{...(tokens[0] as object), direction: tokens[1], nulls: tokens[2]} as any])(
                complexSymbolName,
                orderByDirection,
                orderByNulls, ))));


const limitClause =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{limit: tokens[0]} as any])(
        erase(repeat(commentOrSpace), wordBoundary),
        erase(seqI('limit'),
              qty(1)(commentOrSpace), ),
        decimalIntegerValue, );


const offsetClause =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    trans(tokens => [{offset: tokens[0]} as any])(
        erase(repeat(commentOrSpace), wordBoundary),
        erase(seqI('offset'),
              qty(1)(commentOrSpace), ),
        decimalIntegerValue, );


const forViewClause =
    trans(tokens => [{for: (tokens as string[]).map(x => x.toLowerCase())}])(
        erase(repeat(commentOrSpace), wordBoundary),
        erase(seqI('for'),
              qty(1)(commentOrSpace), ),
        first(
            combine(seqI('view'),
                    qty(0, 1)(combine(
                        erase(repeat(commentOrSpace),
                              cls(','),
                              repeat(commentOrSpace), ),
                        seqI('reference'), ))),
            combine(seqI('reference'),
                    qty(0, 1)(combine(
                        erase(repeat(commentOrSpace),
                              cls(','),
                              repeat(commentOrSpace), ),
                        seqI('view'), )))),
        erase(wordBoundary), );


const forUpdateClause =
    trans(tokens => [{for: (tokens as string[]).map(x => x.toLowerCase())}])(
        erase(repeat(commentOrSpace), wordBoundary),
        erase(seqI('for'),
              qty(1)(commentOrSpace), ),
        seqI('update'),
        first(
            combine(erase(qty(1)(commentOrSpace)),
                    seqI('tracking'),
                    qty(0, 1)(combine(
                        erase(repeat(commentOrSpace),
                              cls(','),
                              repeat(commentOrSpace), ),
                        seqI('viewstat'), ))),
            combine(erase(qty(1)(commentOrSpace)),
                    seqI('viewstat'),
                    qty(0, 1)(combine(
                        erase(repeat(commentOrSpace),
                              cls(','),
                              repeat(commentOrSpace), ),
                        seqI('tracking'), ))),
            zeroWidth(() => void 0), ),
        erase(wordBoundary), );


const selectStatement =
    trans(tokens => {
        let z = {};
        for (const t of tokens) {
            // eslint-disable-next-line @typescript-eslint/ban-types
            z = {...z, ...(t as object)};
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return [z] as any;
    })(
        erase(seqI('select')),
        erase(qty(1)(commentOrSpace)),
        selectFieldList,
        fromClause,
        // TODO: using scope
        qty(0, 1)(whereClause),
        // TODO: with
        qty(0, 1)(combine(
            groupByClause,  // TODO: rollup, cube
            qty(0, 1)(havingClause), )),
        qty(0, 1)(orderByClause),
        qty(0, 1)(limitClause),
        qty(0, 1)(offsetClause),
        qty(0, 1)(first(forViewClause,
                        forUpdateClause, )),
        erase(repeat(commentOrSpace)), );


const program =
    makeProgram(combine(
        beginning(),
        erase(repeat(commentOrSpace)),
        selectStatement,
        erase(repeat(commentOrSpace)),
        end(), ));


export function parse(strings: TemplateStringsArray | string, ...values: any[]): PreparedQuery {
    // TODO: deny dangerous names
    const z = program(
        typeof strings === 'string'
            ? parserInput(strings, {})
            : templateStringsParserInput(strings, values, {})
        );

    if (! z.succeeded) {
        throw new Error(formatErrorMessage(z));
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return z.tokens[0] as any;
}
