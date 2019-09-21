"use strict";
module.exports = verifier;

var Enum      = require("./enum"),
    util      = require("./util");

function invalid(field, expected) {
    return field.name + ": " + expected + (field.repeated && expected !== "array" ? "[]" : field.map && expected !== "object" ? "{k:"+field.keyType+"}" : "") + " expected";
}

/**
 * Generates a partial value verifier.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param {string} ref Variable reference
 * @ignore
 */
function genVerifyValue(field, fieldIndex, ref, $types, $util) {
    /* eslint-disable no-unexpected-multiline */
    if (field.resolvedType) {
        if (field.resolvedType instanceof Enum) {
            var keys = Object.keys(field.resolvedType.values);
            if(keys.indexOf(ref) < 0 )
                return invalid(field, "enum value");
        } else {
                var e=$types[fieldIndex].verify(ref);
                if(e)
                    return field.name + "." + e;
        }
    } else {
        switch (field.type) {
            case "int32":
            case "uint32":
            case "sint32":
            case "fixed32":
            case "sfixed32":
                if(!$util.isInteger(ref))
                    return invalid(field, "integer");
                break;
            case "int64":
            case "uint64":
            case "sint64":
            case "fixed64":
            case "sfixed64":
                if(!$util.isInteger(ref)&&!(ref&&$util.isInteger(ref.low)&&$util.isInteger(ref.high)))
                    return invalid(field, "integer|Long");
                break;
            case "float":
            case "double":
                if(typeof ref!=="number")
                    return invalid(field, "number");
                break;
            case "bool":
                if(typeof ref!=="boolean")
                    return invalid(field, "boolean");
                break;
            case "string":
                if(!$util.isString(ref))
                    return invalid(field, "string");
                break;
            case "bytes":
                if(!(ref&&typeof ref.length==="number"||$util.isString(ref)))
                    return invalid(field, "buffer");
                break;
        }
    }
    return null;
    // if (field.resolvedType) {
    //     if (field.resolvedType instanceof Enum) { gen
    //     ("switch(%s){", ref)
    //     ("default:")
    //     ("return%j", invalid(field, "enum value"));
    //         for (var keys = Object.keys(field.resolvedType.values), j = 0; j < keys.length; ++j) gen
    //         ("case %i:", field.resolvedType.values[keys[j]]);
    //         gen
    //         ("break")
    //         ("}");
    //     } else {
    //         gen
    //         ("{")
    //         ("var e=types[%i].verify(%s);", fieldIndex, ref)
    //         ("if(e)")
    //         ("return%j+e", field.name + ".")
    //         ("}");
    //     }
    // } else {
    //     switch (field.type) {
    //         case "int32":
    //         case "uint32":
    //         case "sint32":
    //         case "fixed32":
    //         case "sfixed32": gen
    //         ("if(!util.isInteger(%s))", ref)
    //         ("return%j", invalid(field, "integer"));
    //             break;
    //         case "int64":
    //         case "uint64":
    //         case "sint64":
    //         case "fixed64":
    //         case "sfixed64": gen
    //         ("if(!util.isInteger(%s)&&!(%s&&util.isInteger(%s.low)&&util.isInteger(%s.high)))", ref, ref, ref, ref)
    //         ("return%j", invalid(field, "integer|Long"));
    //             break;
    //         case "float":
    //         case "double": gen
    //         ("if(typeof %s!==\"number\")", ref)
    //         ("return%j", invalid(field, "number"));
    //             break;
    //         case "bool": gen
    //         ("if(typeof %s!==\"boolean\")", ref)
    //         ("return%j", invalid(field, "boolean"));
    //             break;
    //         case "string": gen
    //         ("if(!util.isString(%s))", ref)
    //         ("return%j", invalid(field, "string"));
    //             break;
    //         case "bytes": gen
    //         ("if(!(%s&&typeof %s.length===\"number\"||util.isString(%s)))", ref, ref, ref)
    //         ("return%j", invalid(field, "buffer"));
    //             break;
    //     }
    // }
    // return gen;
    /* eslint-enable no-unexpected-multiline */
}

/**
 * Generates a partial key verifier.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {string} ref Variable reference
 * @returns {Codegen} Codegen instance
 * @ignore
 */
function genVerifyKey(field, ref, $types, $util) {
    /* eslint-disable no-unexpected-multiline */
    switch (field.keyType) {
        case "int32":
        case "uint32":
        case "sint32":
        case "fixed32":
        case "sfixed32":
            if(!$util.key32Re.test(ref))
                return invalid(field, "integer key");
            break;
        case "int64":
        case "uint64":
        case "sint64":
        case "fixed64":
        case "sfixed64":
            if(!$util.key64Re.test(ref)) // see comment above: x is ok, d is not
                return invalid(field, "integer|Long key");
            break;
        case "bool":
            if(!$util.key2Re.test(ref))
                return invalid(field, "boolean key");
            break;
    }
    return null;
    // switch (field.keyType) {
    //     case "int32":
    //     case "uint32":
    //     case "sint32":
    //     case "fixed32":
    //     case "sfixed32": gen
    //     ("if(!util.key32Re.test(%s))", ref)
    //     ("return%j", invalid(field, "integer key"));
    //         break;
    //     case "int64":
    //     case "uint64":
    //     case "sint64":
    //     case "fixed64":
    //     case "sfixed64": gen
    //     ("if(!util.key64Re.test(%s))", ref) // see comment above: x is ok, d is not
    //     ("return%j", invalid(field, "integer|Long key"));
    //         break;
    //     case "bool": gen
    //     ("if(!util.key2Re.test(%s))", ref)
    //     ("return%j", invalid(field, "boolean key"));
    //         break;
    // }
    // return gen;
    /* eslint-enable no-unexpected-multiline */
}

/**
 * Generates a verifier specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
function verifier(mtype) {
    /* eslint-disable no-unexpected-multiline */
    return function (arg) {
        var $types = arg.types;
        var $util = arg.util;
        var func = function (m) {
            if(typeof m!=="object"||m===null)
                return "object expected";
            var oneofs = mtype.oneofsArray,
                seenFirstField = {};
            if (oneofs.length)
            var p={};
            var res;
            for (var i = 0; i < /* initializes */ mtype.fieldsArray.length; ++i) {
                var field = mtype._fieldsArray[i].resolve(),
                    ref   = m[field.name];

                if (field.optional)
                    if(ref!=null&&m.hasOwnProperty(field.name)){

                // map fields
                if (field.map) {
                    if(!$util.isObject(ref))
                        return invalid(field, "object");
                    var k=Object.keys(ref);
                    for(var _i=0;_i<k.length;++_i){
                        if(res = genVerifyKey(field, k[_i], $types, $util))
                            return res;
                        if(res = genVerifyValue(field, _i, ref[k[_i]], $types, $util))
                            return res;
                    }

                // repeated fields
                } else if (field.repeated) {
                    if(!Array.isArray(ref))
                        return invalid(field, "array");
                    for(var __i=0;__i<ref.length;++__i){
                        if(res = genVerifyValue(field, __i, ref[__i], $types, $util))
                            return res;
                    }

                // required or present fields
                } else {
                    if (field.partOf) {
                        var oneofProp = field.partOf.name;
                        if (seenFirstField[field.partOf.name] === 1)
                    if(p[oneofProp]===1)
                        return field.partOf.name + ": multiple values";
                        seenFirstField[field.partOf.name] = 1;
                    p[oneofProp]=1;
                    }
                    if(res = genVerifyValue(field, i, ref, $types, $util))
                        return res;
                }
                }
            }
            return null;
        };
        return func;
    };
    // var gen = util.codegen(["m"], mtype.name + "$verify")
    // ("if(typeof m!==\"object\"||m===null)")
    //     ("return%j", "object expected");
    // var oneofs = mtype.oneofsArray,
    //     seenFirstField = {};
    // if (oneofs.length) gen
    // ("var p={}");
    //
    // for (var i = 0; i < /* initializes */ mtype.fieldsArray.length; ++i) {
    //     var field = mtype._fieldsArray[i].resolve(),
    //         ref   = "m" + util.safeProp(field.name);
    //
    //     if (field.optional) gen
    //     ("if(%s!=null&&m.hasOwnProperty(%j)){", ref, field.name); // !== undefined && !== null
    //
    //     // map fields
    //     if (field.map) { gen
    //         ("if(!util.isObject(%s))", ref)
    //             ("return%j", invalid(field, "object"))
    //         ("var k=Object.keys(%s)", ref)
    //         ("for(var i=0;i<k.length;++i){");
    //             genVerifyKey(gen, field, "k[i]");
    //             genVerifyValue(gen, field, i, ref + "[k[i]]")
    //         ("}");
    //
    //     // repeated fields
    //     } else if (field.repeated) { gen
    //         ("if(!Array.isArray(%s))", ref)
    //             ("return%j", invalid(field, "array"))
    //         ("for(var i=0;i<%s.length;++i){", ref);
    //             genVerifyValue(gen, field, i, ref + "[i]")
    //         ("}");
    //
    //     // required or present fields
    //     } else {
    //         if (field.partOf) {
    //             var oneofProp = util.safeProp(field.partOf.name);
    //             if (seenFirstField[field.partOf.name] === 1) gen
    //         ("if(p%s===1)", oneofProp)
    //             ("return%j", field.partOf.name + ": multiple values");
    //             seenFirstField[field.partOf.name] = 1;
    //             gen
    //         ("p%s=1", oneofProp);
    //         }
    //         genVerifyValue(gen, field, i, ref);
    //     }
    //     if (field.optional) gen
    //     ("}");
    // }
    // return gen
    // ("return null");
    /* eslint-enable no-unexpected-multiline */
}