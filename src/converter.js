"use strict";
/**
 * Runtime message from/to plain object converters.
 * @namespace
 */
var converter = exports;

var Enum = require("./enum"),
    util = require("./util");

/**
 * Generates a partial value fromObject conveter.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param prop Property reference
 * @ignore
 */
function genValuePartial_fromObject(field, fieldIndex, prop, $types, $util) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    var mm;
    if (field.resolvedType) {
        if (field.resolvedType instanceof Enum) {
            for (var values = field.resolvedType.values, keys = Object.keys(values), i = 0; i < keys.length; ++i) {
                if (field.repeated && values[keys[i]] === field.typeDefault)
                    continue;
                if (keys[i] === prop || values[keys[i]] === prop)
                    mm = values[keys[i]];
            }
        } else {
            if (typeof prop !== "object")
                throw TypeError(field.fullName + ": object expected");
            mm = $types[fieldIndex].fromObject(prop);
        }
    } else {
        var isUnsigned = false;
        switch (field.type) {
            case "double":
            case "float":
                mm = Number(prop); // also catches "NaN", "Infinity"
                break;
            case "uint32":
            case "fixed32":
                mm = prop >>> 0;
                break;
            case "int32":
            case "sint32":
            case "sfixed32":
                mm = prop | 0;
                break;
            case "uint64":
                isUnsigned = true;
            // eslint-disable-line no-fallthrough
            case "int64":
            case "sint64":
            case "fixed64":
            case "sfixed64":
                if ($util.Long)
                    (mm = $util.Long.fromValue(prop)).unsigned = isUnsigned;
                else if (typeof prop === "string")
                    mm = parseInt(prop, 10);
                else if (typeof prop === "number")
                    mm = prop;
                else if (typeof prop === "object")
                    mm = new $util.LongBits(prop.low >>> 0, prop.high >>> 0).toNumber(isUnsigned);
                break;
            case "bytes":
                if (typeof prop === "string")
                    $util.base64.decode(prop, mm = $util.newBuffer($util.base64.length(prop)), 0);
                else if (prop.length)
                    mm = prop;
                break;
            case "string":
                mm = String(prop);
                break;
            case "bool":
                mm = Boolean(prop);
                break;
            /* default: gen
                ("m%s=d%s", prop, prop);
                break; */
        }
    }
    return mm;
    // if (field.resolvedType) {
    //     if (field.resolvedType instanceof Enum) { gen
    //         ("switch(d%s){", prop);
    //         for (var values = field.resolvedType.values, keys = Object.keys(values), i = 0; i < keys.length; ++i) {
    //             if (field.repeated && values[keys[i]] === field.typeDefault) gen
    //             ("default:");
    //             gen
    //             ("case%j:", keys[i])
    //             ("case %i:", values[keys[i]])
    //                 ("m%s=%j", prop, values[keys[i]])
    //                 ("break");
    //         } gen
    //         ("}");
    //     } else gen
    //         ("if(typeof d%s!==\"object\")", prop)
    //             ("throw TypeError(%j)", field.fullName + ": object expected")
    //         ("m%s=types[%i].fromObject(d%s)", prop, fieldIndex, prop);
    // } else {
    //     var isUnsigned = false;
    //     switch (field.type) {
    //         case "double":
    //         case "float": gen
    //             ("m%s=Number(d%s)", prop, prop); // also catches "NaN", "Infinity"
    //             break;
    //         case "uint32":
    //         case "fixed32": gen
    //             ("m%s=d%s>>>0", prop, prop);
    //             break;
    //         case "int32":
    //         case "sint32":
    //         case "sfixed32": gen
    //             ("m%s=d%s|0", prop, prop);
    //             break;
    //         case "uint64":
    //             isUnsigned = true;
    //             // eslint-disable-line no-fallthrough
    //         case "int64":
    //         case "sint64":
    //         case "fixed64":
    //         case "sfixed64": gen
    //             ("if(util.Long)")
    //                 ("(m%s=util.Long.fromValue(d%s)).unsigned=%j", prop, prop, isUnsigned)
    //             ("else if(typeof d%s===\"string\")", prop)
    //                 ("m%s=parseInt(d%s,10)", prop, prop)
    //             ("else if(typeof d%s===\"number\")", prop)
    //                 ("m%s=d%s", prop, prop)
    //             ("else if(typeof d%s===\"object\")", prop)
    //                 ("m%s=new util.LongBits(d%s.low>>>0,d%s.high>>>0).toNumber(%s)", prop, prop, prop, isUnsigned ? "true" : "");
    //             break;
    //         case "bytes": gen
    //             ("if(typeof d%s===\"string\")", prop)
    //                 ("util.base64.decode(d%s,m%s=util.newBuffer(util.base64.length(d%s)),0)", prop, prop, prop)
    //             ("else if(d%s.length)", prop)
    //                 ("m%s=d%s", prop, prop);
    //             break;
    //         case "string": gen
    //             ("m%s=String(d%s)", prop, prop);
    //             break;
    //         case "bool": gen
    //             ("m%s=Boolean(d%s)", prop, prop);
    //             break;
    //         /* default: gen
    //             ("m%s=d%s", prop, prop);
    //             break; */
    //     }
    // }
    // return gen;
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
}

/**
 * Generates a plain object to runtime message converter specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
converter.fromObject = function fromObject(mtype) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    return function (arg) {
        var $types = arg.types, $util = arg.util;
        var func = function (d) {
            var fields = mtype.fieldsArray;
            if (d instanceof this.ctor)
                return d;
            if (!fields.length)
                return new this.ctor;
            var m = new this.ctor;
            for (var i = 0; i < fields.length; ++i) {
                var field = fields[i].resolve(),
                    prop = field.name;

                // Map fields
                if (field.map) {
                    if (d[prop]) {
                        if (typeof d[prop] !== "object")
                            throw TypeError(field.fullName + ": object expected");
                        m[prop] = {};
                        for (var ks = Object.keys(d[prop]), _i = 0; _i < ks.length; ++_i) {
                            m[prop][ks[_i]] = genValuePartial_fromObject(field, /* not sorted */ i, d[prop][ks[_i]], $types, $util);
                        }
                    }
                    // Repeated fields
                } else if (field.repeated) {
                    if (d[prop]) {
                        if (!Array.isArray(d[prop]))
                            throw TypeError(field.fullName + ": array expected");
                        m[prop] = [];
                        for (var __i = 0; __i < d[prop].length; ++__i) {
                            m[prop][__i] = genValuePartial_fromObject(field, /* not sorted */ i, d[prop][__i], $types, $util);
                        }
                    }
                    // Non-repeated fields
                } else {
                    if (field.resolvedType instanceof Enum) {  // no need to test for null/undefined if an enum (uses switch)
                        m[prop] = genValuePartial_fromObject(field, /* not sorted */ i, d[prop], $types, $util);
                    } else {
                        if (d[prop] != null) { // !== undefined && !== null
                            m[prop] = genValuePartial_fromObject(field, /* not sorted */ i, d[prop], $types, $util);
                        }
                    }
                }
            }
            return m;
        };
        return func;
    };
    // var fields = mtype.fieldsArray;
    // var gen = util.codegen(["d"], mtype.name + "$fromObject")
    // ("if(d instanceof this.ctor)")
    //     ("return d");
    // if (!fields.length) return gen
    // ("return new this.ctor");
    // gen
    // ("var m=new this.ctor");
    // for (var i = 0; i < fields.length; ++i) {
    //     var field  = fields[i].resolve(),
    //         prop   = util.safeProp(field.name);
    //
    //     // Map fields
    //     if (field.map) { gen
    // ("if(d%s){", prop)
    //     ("if(typeof d%s!==\"object\")", prop)
    //         ("throw TypeError(%j)", field.fullName + ": object expected")
    //     ("m%s={}", prop)
    //     ("for(var ks=Object.keys(d%s),i=0;i<ks.length;++i){", prop);
    //         genValuePartial_fromObject(gen, field, /* not sorted */ i, prop + "[ks[i]]")
    //     ("}")
    // ("}");
    //
    //     // Repeated fields
    //     } else if (field.repeated) { gen
    // ("if(d%s){", prop)
    //     ("if(!Array.isArray(d%s))", prop)
    //         ("throw TypeError(%j)", field.fullName + ": array expected")
    //     ("m%s=[]", prop)
    //     ("for(var i=0;i<d%s.length;++i){", prop);
    //         genValuePartial_fromObject(gen, field, /* not sorted */ i, prop + "[i]")
    //     ("}")
    // ("}");
    //
    //     // Non-repeated fields
    //     } else {
    //         if (!(field.resolvedType instanceof Enum)) gen // no need to test for null/undefined if an enum (uses switch)
    // ("if(d%s!=null){", prop); // !== undefined && !== null
    //     genValuePartial_fromObject(gen, field, /* not sorted */ i, prop);
    //         if (!(field.resolvedType instanceof Enum)) gen
    // ("}");
    //     }
    // } return gen
    // ("return m");
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
};

/**
 * Generates a partial value toObject converter.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param prop Property reference
 * @ignore
 */
function genValuePartial_toObject(field, fieldIndex, prop, o, $types, $util) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    var dd;
    if (field.resolvedType) {
        if (field.resolvedType instanceof Enum)
            dd = o.enums === String ? $types[fieldIndex].values[prop] : prop;
        else
            dd = $types[fieldIndex].toObject(prop, o);
    } else {
        var isUnsigned = false;
        switch (field.type) {
            case "double":
            case "float":
                dd = o.json && !isFinite(prop) ? String(prop) : prop;
                break;
            case "uint64":
                isUnsigned = true;
            // eslint-disable-line no-fallthrough
            case "int64":
            case "sint64":
            case "fixed64":
            case "sfixed64":
                if (typeof prop === "number")
                    dd = o.longs === String ? String(prop) : prop;
                else // Long-like
                    dd = o.longs === String ? $util.Long.prototype.toString.call(prop) : o.longs === Number ? new $util.LongBits(prop.low >>> 0, prop.high >>> 0).toNumber(isUnsigned) : prop;
                break;
            case "bytes":
                dd = o.bytes === String ? $util.base64.encode(prop, 0, prop.length) : o.bytes === Array ? Array.prototype.slice.call(prop) : prop;
                break;
            default:
                dd = prop;
                break;
        }
    }
    return dd;
    // if (field.resolvedType) {
    //     if (field.resolvedType instanceof Enum) gen
    //         ("d%s=o.enums===String?types[%i].values[m%s]:m%s", prop, fieldIndex, prop, prop);
    //     else gen
    //         ("d%s=types[%i].toObject(m%s,o)", prop, fieldIndex, prop);
    // } else {
    //     var isUnsigned = false;
    //     switch (field.type) {
    //         case "double":
    //         case "float": gen
    //         ("d%s=o.json&&!isFinite(m%s)?String(m%s):m%s", prop, prop, prop, prop);
    //             break;
    //         case "uint64":
    //             isUnsigned = true;
    //             // eslint-disable-line no-fallthrough
    //         case "int64":
    //         case "sint64":
    //         case "fixed64":
    //         case "sfixed64": gen
    //         ("if(typeof m%s===\"number\")", prop)
    //             ("d%s=o.longs===String?String(m%s):m%s", prop, prop, prop)
    //         ("else") // Long-like
    //             ("d%s=o.longs===String?util.Long.prototype.toString.call(m%s):o.longs===Number?new util.LongBits(m%s.low>>>0,m%s.high>>>0).toNumber(%s):m%s", prop, prop, prop, prop, isUnsigned ? "true": "", prop);
    //             break;
    //         case "bytes": gen
    //         ("d%s=o.bytes===String?util.base64.encode(m%s,0,m%s.length):o.bytes===Array?Array.prototype.slice.call(m%s):m%s", prop, prop, prop, prop, prop);
    //             break;
    //         default: gen
    //         ("d%s=m%s", prop, prop);
    //             break;
    //     }
    // }
    // return gen;
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
}

/**
 * Generates a runtime message to plain object converter specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
converter.toObject = function toObject(mtype) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    return function (arg) {
        var $types = arg.types, $util = arg.util;
        var fields = mtype.fieldsArray.slice().sort(util.compareFieldsById);
        if (!fields.length)
            return function () {
                return {};
            };
        var repeatedFields = [],
            mapFields = [],
            normalFields = [],
            i = 0;
        for (; i < fields.length; ++i)
            if (!fields[i].partOf)
                (fields[i].resolve().repeated ? repeatedFields
                    : fields[i].map ? mapFields
                        : normalFields).push(fields[i]);

        function genDefault(o) {
            var d = {};
            if (repeatedFields.length) {
                if (o.arrays || o.defaults) {
                    for (i = 0; i < repeatedFields.length; ++i)
                        d[repeatedFields[i].name] = [];
                }
            }

            if (mapFields.length) {
                if (o.objects || o.defaults) {
                    for (i = 0; i < mapFields.length; ++i)
                        d[mapFields[i].name] = {};
                }
            }

            if (normalFields.length) {
                if (o.defaults) {
                    for (i = 0; i < normalFields.length; ++i) {
                        var field = normalFields[i],
                            prop = field.name;
                        if (field.resolvedType instanceof Enum)
                            d[prop] = o.enums === String ? field.resolvedType.valuesById[field.typeDefault] : field.typeDefault;
                        else if (field.long)
                            if (util.Long) {
                                var n = new util.Long(field.typeDefault.low, field.typeDefault.high, field.typeDefault.unsigned);
                                d[prop] = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
                            } else
                                d[prop] = o.longs === String ? field.typeDefault.toString() : field.typeDefault.toNumber();
                        else if (field.bytes) {
                            if (o.bytes === String) d[prop] = String.fromCharCode.apply(String, field.typeDefault);
                            else {
                                d[prop] = Array.prototype.slice.call(field.typeDefault);
                                if (o.bytes !== Array) d[prop] = $util.newBuffer(d[prop]);
                            }
                        } else
                            d[prop] = field.typeDefault; // also messages (=null)
                    }
                }
            }
            return d;
        }

        var func = function (m, o) {
            if (!o)
                o = {};
            var d = genDefault(o);
            for (i = 0; i < fields.length; ++i) {
                var field = fields[i],
                    index = mtype._fieldsArray.indexOf(field),
                    prop = field.name;
                if (field.map) {
                    var ks2;
                    if (m[prop] && (ks2 = Object.keys(m[prop])).length) {
                        d[prop] = {};
                        for (var _i = 0; _i < ks2.length; ++_i) {
                            d[prop][ks2[_i]] = genValuePartial_toObject(field, /* sorted */ index, m[prop][ks2[_i]], o, $types, $util);
                        }
                    }
                } else if (field.repeated) {
                    if (m[prop] && m[prop].length) {
                        d[prop] = [];
                        for (var __i = 0; __i < m[prop].length; ++__i) {
                            d[prop][__i] = genValuePartial_toObject(field, /* sorted */ index, m[prop][__i], o, $types, $util);
                        }
                    }
                } else {
                    if (m[prop] != null && m.hasOwnProperty(prop)) { // !== undefined && !== null
                        d[prop] = genValuePartial_toObject(field, /* sorted */ index, m[prop], o, $types, $util);
                        if (field.partOf)
                            if (o.oneofs)
                                d[field.partOf.name] = prop;
                    }
                }
            }
            return d;
        };
        return func;
    };
    // var fields = mtype.fieldsArray.slice().sort(util.compareFieldsById);
    // if (!fields.length)
    //     return util.codegen()("return {}");
    // var gen = util.codegen(["m", "o"], mtype.name + "$toObject")
    // ("if(!o)")
    //     ("o={}")
    // ("var d={}");
    //
    // var repeatedFields = [],
    //     mapFields = [],
    //     normalFields = [],
    //     i = 0;
    // for (; i < fields.length; ++i)
    //     if (!fields[i].partOf)
    //         ( fields[i].resolve().repeated ? repeatedFields
    //         : fields[i].map ? mapFields
    //         : normalFields).push(fields[i]);
    //
    // if (repeatedFields.length) { gen
    // ("if(o.arrays||o.defaults){");
    //     for (i = 0; i < repeatedFields.length; ++i) gen
    //     ("d%s=[]", util.safeProp(repeatedFields[i].name));
    //     gen
    // ("}");
    // }
    //
    // if (mapFields.length) { gen
    // ("if(o.objects||o.defaults){");
    //     for (i = 0; i < mapFields.length; ++i) gen
    //     ("d%s={}", util.safeProp(mapFields[i].name));
    //     gen
    // ("}");
    // }
    //
    // if (normalFields.length) { gen
    // ("if(o.defaults){");
    //     for (i = 0; i < normalFields.length; ++i) {
    //         var field = normalFields[i],
    //             prop  = util.safeProp(field.name);
    //         if (field.resolvedType instanceof Enum) gen
    //     ("d%s=o.enums===String?%j:%j", prop, field.resolvedType.valuesById[field.typeDefault], field.typeDefault);
    //         else if (field.long) gen
    //     ("if(util.Long){")
    //         ("var n=new util.Long(%i,%i,%j)", field.typeDefault.low, field.typeDefault.high, field.typeDefault.unsigned)
    //         ("d%s=o.longs===String?n.toString():o.longs===Number?n.toNumber():n", prop)
    //     ("}else")
    //         ("d%s=o.longs===String?%j:%i", prop, field.typeDefault.toString(), field.typeDefault.toNumber());
    //         else if (field.bytes) {
    //             var arrayDefault = "[" + Array.prototype.slice.call(field.typeDefault).join(",") + "]";
    //             gen
    //     ("if(o.bytes===String)d%s=%j", prop, String.fromCharCode.apply(String, field.typeDefault))
    //     ("else{")
    //         ("d%s=%s", prop, arrayDefault)
    //         ("if(o.bytes!==Array)d%s=util.newBuffer(d%s)", prop, prop)
    //     ("}");
    //         } else gen
    //     ("d%s=%j", prop, field.typeDefault); // also messages (=null)
    //     } gen
    // ("}");
    // }
    // var hasKs2 = false;
    // for (i = 0; i < fields.length; ++i) {
    //     var field = fields[i],
    //         index = mtype._fieldsArray.indexOf(field),
    //         prop  = util.safeProp(field.name);
    //     if (field.map) {
    //         if (!hasKs2) { hasKs2 = true; gen
    // ("var ks2");
    //         } gen
    // ("if(m%s&&(ks2=Object.keys(m%s)).length){", prop, prop)
    //     ("d%s={}", prop)
    //     ("for(var j=0;j<ks2.length;++j){");
    //         genValuePartial_toObject(gen, field, /* sorted */ index, prop + "[ks2[j]]")
    //     ("}");
    //     } else if (field.repeated) { gen
    // ("if(m%s&&m%s.length){", prop, prop)
    //     ("d%s=[]", prop)
    //     ("for(var j=0;j<m%s.length;++j){", prop);
    //         genValuePartial_toObject(gen, field, /* sorted */ index, prop + "[j]")
    //     ("}");
    //     } else { gen
    // ("if(m%s!=null&&m.hasOwnProperty(%j)){", prop, field.name); // !== undefined && !== null
    //     genValuePartial_toObject(gen, field, /* sorted */ index, prop);
    //     if (field.partOf) gen
    //     ("if(o.oneofs)")
    //         ("d%s=%j", util.safeProp(field.partOf.name), field.name);
    //     }
    //     gen
    // ("}");
    // }
    // return gen
    // ("return d");
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
};
