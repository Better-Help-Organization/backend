export function toEthiopianTime(date: Date | string): string {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
        console.error("Invalid date passed:", date);
        return "";
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Addis_Ababa",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    return formatter.format(d);
}