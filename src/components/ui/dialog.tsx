"use client"

import { Modal, type ModalProps } from "@/components/ui/modal"

/**
 * @deprecated Use {@link ModalProps} from `@/components/ui/modal` instead.
 */
export type DialogProps = Omit<ModalProps, "variant" | "size">

/**
 * @deprecated Use `Modal` from `@/components/ui/modal` instead. `Dialog` is a
 * thin adapter over the centered Modal variant, kept only so existing call
 * sites keep compiling; it will be removed once callers migrate.
 */
export function Dialog(props: DialogProps) {
    return <Modal variant="center" {...props} />
}
