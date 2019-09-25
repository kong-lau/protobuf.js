"use strict";
module.exports = interface_target;

var protobuf = require("../..");

var Type = protobuf.Type,
    Service = protobuf.Service,
    Enum = protobuf.Enum,
    Namespace = protobuf.Namespace,
    util = protobuf.util;

var out = [];
var indent = 0;
var config = {};

interface_target.description = "Only interface jsdoc for gen tsd file";

function interface_target(root, options, callback) {
    config = options;
    try {
        buildNamespace(null, root);
        return callback(null, out.join("\n"));
    } catch (err) {
        return callback(err);
    } finally {
        out = [];
        indent = 0;
        config = {};
    }
}

function push(line) {
    if (line === "")
        return out.push("");
    var ind = "";
    for (var i = 0; i < indent; ++i)
        ind += "    ";
    return out.push(ind + line);
}

function pushComment(lines) {
    if (!config.comments)
        return;
    var split = [];
    for (var i = 0; i < lines.length; ++i)
        if (lines[i] != null && lines[i].substring(0, 8) !== "@exclude")
            Array.prototype.push.apply(split, lines[i].split(/\r?\n/g));
    push("/**");
    split.forEach(function (line) {
        if (line === null)
            return;
        push(" * " + line.replace(/\*\//g, "* /"));
    });
    push(" */");
}

function exportName(object, asInterface) {
    if (asInterface) {
        if (object.__interfaceName)
            return object.__interfaceName;
    } else if (object.__exportName)
        return object.__exportName;
    var parts = object.fullName.substring(1).split("."),
        i = 0;
    while (i < parts.length)
        parts[i] = escapeName(parts[i++]);
    if (asInterface)
        parts[i - 1] = "I" + parts[i - 1];
    return object[asInterface ? "__interfaceName" : "__exportName"] = parts.join(".");
}

function escapeName(name) {
    if (!name)
        return "$root";
    return util.isReserved(name) ? name + "_" : name;
}

function aOrAn(name) {
    return ((/^[hH](?:ou|on|ei)/.test(name) || /^[aeiouAEIOU][a-z]/.test(name)) && !/^us/i.test(name)
        ? "an "
        : "a ") + name;
}

function buildNamespace(ref, ns) {
    if (!ns)
        return;
    if (ns instanceof Type) {
        buildType(undefined, ns);
    } else if (ns instanceof Service) { // ignore service
    } else if (ns.name !== "") {
        push("");
        pushComment([
            ns.comment || "Namespace " + ns.name + ".",
            ns.parent instanceof protobuf.Root ? "@exports " + escapeName(ns.name) : "@memberof " + exportName(ns.parent),
            "@namespace"
        ]);
        push((config.es6 ? "const" : "var") + " " + escapeName(ns.name) + " = {};");
    }

    ns.nestedArray.forEach(function (nested) {
        if (nested instanceof Enum)
            buildEnum(ns.name, nested);
        else if (nested instanceof Namespace)
            buildNamespace(ns.name, nested);
    });
}

function toJsType(field) {
    var type;

    switch (field.type) {
        case "double":
        case "float":
        case "int32":
        case "uint32":
        case "sint32":
        case "fixed32":
        case "sfixed32":
            type = "number";
            break;
        case "int64":
        case "uint64":
        case "sint64":
        case "fixed64":
        case "sfixed64":
            type = config.forceLong ? "Long" : config.forceNumber ? "number" : "number|Long";
            break;
        case "bool":
            type = "boolean";
            break;
        case "string":
            type = "string";
            break;
        case "bytes":
            type = "Uint8Array";
            break;
        default:
            if (field.resolve().resolvedType)
                type = exportName(field.resolvedType, !(field.resolvedType instanceof protobuf.Enum || config.forceMessage));
            else
                type = "*"; // should not happen
            break;
    }
    if (field.map)
        return "Object.<string," + type + ">";
    if (field.repeated)
        return "Array.<" + type + ">";
    return type;
}

function buildType(ref, type) {
    if (config.comments) {
        var typeDef = [
            "Properties of " + aOrAn(type.name) + ".",
            type.parent instanceof protobuf.Root ? "@exports " + escapeName("I" + type.name) : "@memberof " + exportName(type.parent),
            "@interface " + escapeName("I" + type.name)
        ];
        type.fieldsArray.forEach(function (field) {
            var prop = util.safeProp(field.name); // either .name or ["name"]
            prop = prop.substring(1, prop.charAt(0) === "[" ? prop.length - 1 : prop.length);
            var jsType = toJsType(field);
            typeDef.push("@property {" + jsType + "} " + (field.optional ? "[" + prop + "]" : prop) + " " + (field.comment || type.name + " " + field.name));
        });
        push("");
        pushComment(typeDef);
    }
}

function buildEnum(ref, enm) {
    push("");
    var comment = [
        enm.comment || enm.name + " enum.",
        enm.parent instanceof protobuf.Root ? "@exports " + escapeName(enm.name) : "@name " + exportName(enm),
        config.forceEnumString ? "@enum {number}" : "@enum {string}",
    ];
    Object.keys(enm.values).forEach(function (key) {
        var val = config.forceEnumString ? key : enm.values[key];
        comment.push((config.forceEnumString ? "@property {string} " : "@property {number} ") + key + "=" + val + " " + (enm.comments[key] || key + " value"));
    });
    pushComment(comment);
}
