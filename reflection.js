import {TargetRelativeDirectPointerRuntime} from "./util";

class FieldDescriptor {
    static offsets = {
        'MangledTypeName': 0,
        'Superclass': 4,
        'Kind': 8,
        'FieldRecordSize': 10,
        'NumFields': 12
    }

    static size = 16;

    constructor(ptr) {
        this.ptr = ptr;
    }

    get numFields() {
        return this.ptr.add(FieldDescriptor.offsets.NumFields).readU32();
    }

    get _fieldRecordBuffer() {
        return this.ptr.add(FieldDescriptor.size)
    }

    readFields() {
        let fieldPtr = this._fieldRecordBuffer;
        for(let i = 0; i < this.numFields; i++) {
            console.log(' - ' + TargetRelativeDirectPointerRuntime(fieldPtr.add(8))
                .readUtf8String());
            fieldPtr = fieldPtr.add(12);
        }
    }
}


module.exports = {
    FieldDescriptor,
}