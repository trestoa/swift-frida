"use strict";

/* jshint esnext: true, evil: true */


let _api = null;
let size_t = Process.pointerSize === 8 ? 'uint64' : Process.pointerSize === 4 ? 'uint32' : "unsupported platform";

module.exports = {
    get api() {
        if (_api !== null)
            return _api;

        const CC = require('./calling-convention').convention;
        const temporaryApi = {};
        const pending = [
            {
                module: "libsystem_malloc.dylib",
                functions: {
                    "free": ['void', ['pointer']],
                },
                // optionals are functions/variables that might not be available
                optionals: {
                    "free": "leaks don't break functionality",
                }
            },
            {
                module: "libmacho.dylib",
                functions: {
                    "getsectiondata": ['pointer', ['pointer', 'pointer', 'pointer', 'pointer']],
                }
            },
            {
                module: "libswiftFoundation.dylib",
                functions: {
                    "$sSS10FoundationE8EncodingV4utf8ACvgZ": ['pointer', []],
                    "$sSy10FoundationE7cString5usingSays4Int8VGSgSSAAE8EncodingV_tF": ['pointer', ['pointer', 'pointer', 'pointer']],
                }
            },
            {
                module: "CoreFoundation",
                functions: {
                    "CFGetRetainCount": ['long', ['pointer']],
                }
            },
            {
                module: "Foundation",
                functions: {
                    'objc_storeStrong': ['void', ['pointer', 'pointer']],
                }
            },
            {
                // see https://github.com/apple/swift/blob/master/docs/Runtime.md
                module: "libswiftCore.dylib",
                variables: new Set([
                    //"_$sSSSysWP", // protocol witness table for Swift.String : Swift.StringProtocol in Swift
                    "$sSSs16TextOutputStreamsWP", // protocol witness table for Swift.String : Swift.TextOutputStream in Swift
                    // "_T0s19_emptyStringStorages6UInt32Vv", // Swift._emptyStringStorage
                    "_swift_release", // pointer to _swift_release_
                    "$sSSMn", // nominal type descriptor for Swift.String
                ]),
                functions: {
                    "swift_demangle": ['pointer', ['pointer', size_t, 'pointer', 'pointer', 'int32']],

                    'swift_unknownObjectRelease': ['void', ['pointer']],
                    'swift_bridgeObjectRelease': ['void', ['pointer']],
                    'swift_weakLoadStrong': ['pointer', ['pointer']],
                    'swift_weakAssign': ['void', ['pointer', 'pointer']],
                    'swift_weakInit': ['void', ['pointer', 'pointer']],
                    'swift_release': ['void', ['pointer']],
                    'swift_retain': ['void', ['pointer']],

                    //'swift_allocObject': ['pointer', ['pointer', size_t, size_t]],
                    'swift_allocBox': [['pointer', 'pointer'], ['pointer']],
                    //'swift_deallocBox': ['void', ['pointer']],
                    'swift_projectBox': ['pointer', ['pointer']],
                    // TODO [Markus]: fix this
                    //'swift_stringFromUTF8InRawMemory': ['void', ['pointer', 'pointer', size_t]],

                    "swift_getTupleTypeMetadata": ['pointer', [size_t, 'pointer', 'pointer', 'pointer']],
                    "swift_getExistentialMetatypeMetadata": ['pointer', ['pointer']],
                    "swift_getExistentialTypeMetadata": ['pointer', ['int8', 'pointer', size_t, 'pointer']],
                    //'swift_getGenericMetadata': ['pointer', ['pointer', 'pointer']],
                    "swift_getObjCClassMetadata": ['pointer', ['pointer']],
                    "swift_getFunctionTypeMetadata": ['pointer', ['pointer']],
                    "swift_getForeignTypeMetadata": ['pointer', ['pointer']],
                    "swift_getMetatypeMetadata": ['pointer', ['pointer']],

                    //"swift_getEnumCaseSinglePayload": ['int',  ['pointer', 'pointer', 'uint']],
                    "swift_getEnumCaseMultiPayload": ['uint',  ['pointer', 'pointer']],

                    'swift_conformsToProtocol': ['pointer', ['pointer', 'pointer']],
                    'swift_dynamicCast': ['bool', ['pointer', 'pointer', 'pointer', 'pointer', size_t]],
                    "swift_getDynamicType": ['pointer', ['pointer', 'pointer', 'int8']],

                    // TODO [Markus]: fix this
                    //"swift_getTypeByName": ['pointer', ['pointer', size_t]],
                    "swift_getTypeName": [['pointer', 'pointer'],  ['pointer', 'uchar']],

                    "$ss4dump_2to4name6indent8maxDepth0E5Itemsxx_q_zSSSgS3its16TextOutputStreamR_r0_lF": CC.indirectResultRegister === undefined ?
                        // no special indirect result register: one more param for indirect result
                        ['void', ['pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'int', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer']] :
                        // indirect result register must be set by hook
                        ['void', ['pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'int', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer']],

                },
            }
        ];
        pending.forEach(api => {
            const functions = api.functions || {};
            const variables = api.variables || new Set();
            const optionals = api.optionals || {};

            const exportByName = Module
            .enumerateExportsSync(api.module)
            .reduce((result, exp) => {
                result[exp.name] = exp;
                return result;
            }, {});

            Object.keys(functions)
            .forEach(function (name) {
                console.log('Initializing low level API function ' + name);
                const exp = exportByName[name];
                if (exp !== undefined && exp.type === 'function') {
                    const signature = functions[name];
                    if (typeof signature === 'function') {
                        signature.call(temporaryApi, exp.address);
                    } else {
                        temporaryApi[name] = new NativeFunction(exp.address, signature[0], signature[1], signature[2]);
                    }
                } else if(!(name in optionals)) {
                    throw new Error(`missing function '${name}' in module '${api.module}`);
                }
            });

            variables.forEach(function (name) {
                const exp = exportByName[name];
                console.log("Initializing low level API variable " + name);
                console.log(exp);
                if (exp !== undefined && exp.type === 'variable') {
                    temporaryApi[name] = exp.address;
                } else if(!(name in optionals)) {
                    throw new Error(`missing variable '${name}' in module '${api.module}`);
                }
            });
        });


        _api = temporaryApi;
        return _api;
    }
};
