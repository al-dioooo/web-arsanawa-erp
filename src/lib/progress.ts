type Listener = (state: { loading: boolean; progress: number }) => void
const listeners = new Set<Listener>()

let activeCount = 0
let progress = 0
let timer: NodeJS.Timeout | null = null

function update(loading: boolean, nextProgress: number) {
    progress = nextProgress
    listeners.forEach(l => l({ loading: activeCount > 0 || loading, progress }))
}

export const progressManager = {
    subscribe(listener: Listener) {
        listeners.add(listener)
        listener({ loading: activeCount > 0, progress })
        return () => {
            listeners.delete(listener)
        }
    },
    start() {
        activeCount++
        if (activeCount === 1) {
            if (timer) clearInterval(timer)
            update(true, 0)
            timer = setInterval(() => {
                if (progress < 90) {
                    const diff = Math.random() * 5 + 2
                    update(true, Math.min(90, progress + diff))
                }
            }, 250)
        }
    },
    done() {
        if (activeCount > 0) activeCount--
        if (activeCount === 0) {
            if (timer) {
                clearInterval(timer)
                timer = null
            }
            update(true, 100)
            setTimeout(() => {
                update(false, 0)
            }, 200)
        }
    }
}
