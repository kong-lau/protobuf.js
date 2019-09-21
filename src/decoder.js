"use strict";
module.exports = decoder;

var Enum = require("./enum"),
    types = require("./types"),
    util = require("./util");

function missing(field) {
    return "missing required '" + field.name + "'";
}

/**
 * Generates a decoder specific to the specified message type.
 * @param {Type} mtype Message type
 */
function decoder(mtype) {
    /* eslint-disable no-unexpected-multiline */
    return function (arg) {
        var $Reader = arg.Reader, $types = arg.types, $util = arg.util;
        var $fieldCache = {}, fieldsArray = mtype.fieldsArray, requiredFields = [];
        for (var idx = 0, len = fieldsArray.length; idx < len; ++idx) {
            var f = mtype._fieldsArray[idx].resolve();
            $fieldCache[f.id] = {field: f, index: idx};
            if (f.required) {
                requiredFields.push(f);
            }
        }
        var func = function (r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new this.ctor, k;
            while (r.pos < c) {
                var t = r.uint32();
                if (mtype.group) {
                    if ((t & 7) === 4)
                        break;
                }
                var cache = $fieldCache[t >>> 3];
                if (cache) {
                    var i = cache.index,
                        field = cache.field,
                        name = field.name,
                        type = field.resolvedType instanceof Enum ? "int32" : field.type;
                    //ref   = m[field.name];
                    if (field.map) {
                        r.skip().pos++;
                        if (m[name] === $util.emptyObject)
                            m[name] = {};
                        k = r[field.keyType]();
                        r.pos++;
                        if (types.long[field.keyType] !== undefined) {
                            if (types.basic[type] === undefined) {
                                m[name][typeof k === "object" ? $util.longToHash(k) : k] = $types[i].decode(r, r.uint32());
                            } else {
                                m[name][typeof k === "object" ? $util.longToHash(k) : k] = r[type]();
                            }
                        } else {
                            if (types.basic[type] === undefined) {
                                m[name] = $types[i].decode(r, r.uint32());
                            } else {
                                m[name] = r[type]();
                            }
                        }
                    } else if (field.repeated) {
                        if (!(m[name] && m[name].length))
                            m[name] = [];
                        if (types.packed[type] !== undefined) {
                            if ((t & 7) === 2) {
                                var c2 = r.uint32() + r.pos;
                                while (r.pos < c2)
                                    m[name].push(r[type]());
                            } else {
                                m[name].push(r[type]());
                            }
                        } else if (types.basic[type] === undefined) {
                            if (field.resolvedType.group) {
                                m[name].push($types[i].decode(r));
                            } else {
                                var len = r.uint32();
                                if (!len) {
                                    continue;
                                }
                                m[name].push($types[i].decode(r, len));
                            }
                        } else {
                            m[name].push(r[type]());
                        }
                    } else if (types.basic[type] === undefined) {
                        if (field.resolvedType.group)
                            m[name] = $types[i].decode(r);
                        else
                            m[name] = $types[i].decode(r, r.uint32());
                    } else {
                        m[name] = r[type]();
                    }
                } else {
                    r.skipType(t & 7);
                }
            }
            for (var j = 0; j < requiredFields.length; ++j) {
                var rfield = requiredFields[j];
                if (!m.hasOwnProperty(rfield.name)) {
                    throw $util.ProtocolError(missing(rfield), {instance: m});
                }
            }
            return m;
        };
        return func;
    };
    // var gen = util.codegen(["r", "l"], mtype.name + "$decode")
    // ("if(!(r instanceof Reader))")
    //     ("r=Reader.create(r)")
    // ("var c=l===undefined?r.len:r.pos+l,m=new this.ctor" + (mtype.fieldsArray.filter(function(field) { return field.map; }).length ? ",k" : ""))
    // ("while(r.pos<c){")
    //     ("var t=r.uint32()");
    // if (mtype.group) gen
    //     ("if((t&7)===4)")
    //         ("break");
    // gen
    //     ("switch(t>>>3){");
    //
    // var i = 0;
    // for (; i < /* initializes */ mtype.fieldsArray.length; ++i) {
    //     var field = mtype._fieldsArray[i].resolve(),
    //         type  = field.resolvedType instanceof Enum ? "int32" : field.type,
    //         ref   = "m" + util.safeProp(field.name); gen
    //         ("case %i:", field.id);
    //
    //     // Map fields
    //     if (field.map) { gen
    //             ("r.skip().pos++") // assumes id 1 + key wireType
    //             ("if(%s===util.emptyObject)", ref)
    //                 ("%s={}", ref)
    //             ("k=r.%s()", field.keyType)
    //             ("r.pos++"); // assumes id 2 + value wireType
    //         if (types.long[field.keyType] !== undefined) {
    //             if (types.basic[type] === undefined) gen
    //             ("%s[typeof k===\"object\"?util.longToHash(k):k]=types[%i].decode(r,r.uint32())", ref, i); // can't be groups
    //             else gen
    //             ("%s[typeof k===\"object\"?util.longToHash(k):k]=r.%s()", ref, type);
    //         } else {
    //             if (types.basic[type] === undefined) gen
    //             ("%s[k]=types[%i].decode(r,r.uint32())", ref, i); // can't be groups
    //             else gen
    //             ("%s[k]=r.%s()", ref, type);
    //         }
    //
    //     // Repeated fields
    //     } else if (field.repeated) { gen
    //
    //             ("if(!(%s&&%s.length))", ref, ref)
    //                 ("%s=[]", ref);
    //
    //         // Packable (always check for forward and backward compatiblity)
    //         if (types.packed[type] !== undefined) gen
    //             ("if((t&7)===2){")
    //                 ("var c2=r.uint32()+r.pos")
    //                 ("while(r.pos<c2)")
    //                     ("%s.push(r.%s())", ref, type)
    //             ("}else");
    //
    //         // Non-packed
    //         if (types.basic[type] === undefined) gen(field.resolvedType.group
    //                 ? "%s.push(types[%i].decode(r))"
    //                 : "%s.push(types[%i].decode(r,r.uint32()))", ref, i);
    //         else gen
    //                 ("%s.push(r.%s())", ref, type);
    //
    //     // Non-repeated
    //     } else if (types.basic[type] === undefined) gen(field.resolvedType.group
    //             ? "%s=types[%i].decode(r)"
    //             : "%s=types[%i].decode(r,r.uint32())", ref, i);
    //     else gen
    //             ("%s=r.%s()", ref, type);
    //     gen
    //             ("break");
    // // Unknown fields
    // } gen
    //         ("default:")
    //             ("r.skipType(t&7)")
    //             ("break")
    //
    //     ("}")
    // ("}");
    //
    // // Field presence
    // for (i = 0; i < mtype._fieldsArray.length; ++i) {
    //     var rfield = mtype._fieldsArray[i];
    //     if (rfield.required) gen
    // ("if(!m.hasOwnProperty(%j))", rfield.name)
    //     ("throw util.ProtocolError(%j,{instance:m})", missing(rfield));
    // }
    //
    // return gen
    // ("return m");
    /* eslint-enable no-unexpected-multiline */
}
