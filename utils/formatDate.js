function formatDate(d){
    const date = new Date(d)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`

    return formattedDate
}

module.exports = formatDate