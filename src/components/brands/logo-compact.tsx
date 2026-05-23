type Props = {
    className?: string
    color?: "teal" | "black" | "white"
}

export default function LogoCompact({ className, color = "teal" }: Props) {
    const colorMap = {
        "teal": "#0B5C6A",
        "black": "#000",
        "white": "#FFF"
    }

    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" fill="none">
            <path fill={colorMap[color]} d="M0 44.8 16.32 0h11.712l16.384 44.8H34.56c-.64-1.579-1.259-2.923-1.856-4.032-.597-1.11-1.387-2.261-2.368-3.456a8.849 8.849 0 0 0-3.456-2.688c-1.365-.64-2.901-.96-4.608-.96-1.75 0-3.307.32-4.672.96-1.365.597-2.539 1.493-3.52 2.688-.981 1.195-1.77 2.347-2.368 3.456-.597 1.11-1.216 2.453-1.856 4.032H0Zm13.312-9.536c2.261-4.693 5.248-7.04 8.96-7.04 3.541 0 6.528 2.347 8.96 7.04l-6.08-17.408c-1.365-4.01-2.325-7.915-2.88-11.712-.555 3.797-1.515 7.701-2.88 11.712l-6.08 17.408Z" />
        </svg>
    )
}