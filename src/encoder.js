"use strict";
module.exports = encoder;

var Enum = require("./enum"),
    types = require("./types"),
    util = require("./util");

/**
 * Generates a partial message type encoder.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param {string} ref Variable reference
 * @ignore
 */
function genTypePartial(field, fieldIndex, ref, _types, w) {
    return field.resolvedType.group
        ? _types[fieldIndex].encode(ref, w.uint32((field.id << 3 | 3) >>> 0)).uint32((field.id << 3 | 4) >>> 0)
        : _types[fieldIndex].encode(ref, w.uint32((field.id << 3 | 2) >>> 0).fork()).ldelim();
}

/**
 * Generates an encoder specific to the specified message type.
 * @param {Type} mtype Message type
 */
function encoder(mtype) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    return function (arg) {
        var $Writer = arg.Writer, $types = arg.types, $util = arg.util;
        var func = function (m, w) {
            if (!w)
                w = $Writer.create();

            var i, ref;

            // "when a message is serialized its known fields should be written sequentially by field number"
            var fields = /* initializes */ mtype.fieldsArray.slice().sort($util.compareFieldsById);

            for (i = 0; i < fields.length; ++i) {
                var field = fields[i].resolve(),
                    index = mtype._fieldsArray.indexOf(field),
                    type = field.resolvedType instanceof Enum ? "int32" : field.type,
                    wireType = types.basic[type];
                ref = m[field.name];
                if (field.resolvedType instanceof Enum && typeof ref === "string") {
                    ref = $types[index].values[ref];
                }
                // Map fields
                if (field.map) {
                    if (ref != null && Object.hasOwnProperty.call(m, field.name)) { // !== undefined && !== null
                        for (var ks = Object.keys(ref), j = 0; j < ks.length; ++j) {
                            w.uint32((field.id << 3 | 2) >>> 0).fork().uint32(8 | types.mapKey[field.keyType])[field.keyType](ks[j]);
                            if (wireType === undefined)
                                $types[index].encode(ref[ks[j]], w.uint32(18).fork()).ldelim().ldelim(); // can't be groups
                            else
                                w.uint32(16 | wireType)[type](ref[ks[j]]).ldelim();
                        }
                    }

                    // Repeated fields
                } else if (field.repeated) {
                    if (ref != null && ref.length) { // !== undefined && !== null
                        // Packed repeated
                        if (field.packed && types.packed[type] !== undefined) {
                            w.uint32((field.id << 3 | 2) >>> 0).fork();
                            for (var k = 0; k < ref.length; ++k)
                                w[type](ref[k]);
                            w.ldelim();
                            // Non-packed
                        } else {
                            for (var l = 0; l < ref.length; ++l)
                                if (wireType === undefined)
                                    genTypePartial(field, index, ref[l], $types, w);
                                else
                                    w.uint32((field.id << 3 | wireType) >>> 0)[type](ref[l]);
                        }
                    }

                    // Non-repeated
                } else {
                    if (field.optional)
                        if (ref != null && Object.hasOwnProperty.call(m, field.name)) // !== undefined && !== null
                            if (wireType === undefined)
                                genTypePartial(field, index, ref, $types, w);
                            else
                                w.uint32((field.id << 3 | wireType) >>> 0)[type](ref);

                }
            }
            return w;
        };
        return func;
    };
    // var gen = util.codegen(["m", "w"], mtype.name + "$encode")
    // ("if(!w)")
    //     ("w=Writer.create()");
    //
    // var i, ref;
    //
    // // "when a message is serialized its known fields should be written sequentially by field number"
    // var fields = /* initializes */ mtype.fieldsArray.slice().sort(util.compareFieldsById);
    //
    // for (var i = 0; i < fields.length; ++i) {
    //     var field    = fields[i].resolve(),
    //         index    = mtype._fieldsArray.indexOf(field),
    //         type     = field.resolvedType instanceof Enum ? "int32" : field.type,
    //         wireType = types.basic[type];
    //         ref      = "m" + util.safeProp(field.name);
    //
    //     // Map fields
    //     if (field.map) {
    //         gen
    // ("if(%s!=null&&Object.hasOwnProperty.call(m,%j)){", ref, field.name) // !== undefined && !== null
    //     ("for(var ks=Object.keys(%s),i=0;i<ks.length;++i){", ref)
    //         ("w.uint32(%i).fork().uint32(%i).%s(ks[i])", (field.id << 3 | 2) >>> 0, 8 | types.mapKey[field.keyType], field.keyType);
    //         if (wireType === undefined) gen
    //         ("types[%i].encode(%s[ks[i]],w.uint32(18).fork()).ldelim().ldelim()", index, ref); // can't be groups
    //         else gen
    //         (".uint32(%i).%s(%s[ks[i]]).ldelim()", 16 | wireType, type, ref);
    //         gen
    //     ("}")
    // ("}");
    //
    //         // Repeated fields
    //     } else if (field.repeated) { gen
    // ("if(%s!=null&&%s.length){", ref, ref); // !== undefined && !== null
    //
    //         // Packed repeated
    //         if (field.packed && types.packed[type] !== undefined) { gen
    //
    //     ("w.uint32(%i).fork()", (field.id << 3 | 2) >>> 0)
    //     ("for(var i=0;i<%s.length;++i)", ref)
    //         ("w.%s(%s[i])", type, ref)
    //     ("w.ldelim()");
    //
    //         // Non-packed
    //         } else { gen
    //
    //     ("for(var i=0;i<%s.length;++i)", ref);
    //             if (wireType === undefined)
    //         genTypePartial(gen, field, index, ref + "[i]");
    //             else gen
    //         ("w.uint32(%i).%s(%s[i])", (field.id << 3 | wireType) >>> 0, type, ref);
    //
    //         } gen
    // ("}");
    //
    //     // Non-repeated
    //     } else {
    //         if (field.optional) gen
    // ("if(%s!=null&&Object.hasOwnProperty.call(m,%j))", ref, field.name); // !== undefined && !== null
    //
    //         if (wireType === undefined)
    //     genTypePartial(gen, field, index, ref);
    //         else gen
    //     ("w.uint32(%i).%s(%s)", (field.id << 3 | wireType) >>> 0, type, ref);
    //
    //     }
    // }
    //
    // return gen
    // ("return w");
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
}
