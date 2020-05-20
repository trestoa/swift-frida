
export function TargetRelativeDirectPointerRuntime(ptr, nullable) {
    let offset = Memory.readS32(ptr);
    if (nullable && offset === 0)
        return null;
    return ptr.add(offset);
}

