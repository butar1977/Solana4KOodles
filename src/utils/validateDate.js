function validateDate(inputDate) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(inputDate)) return 'Invalid format. Use YYYY-MM-DD.';

    const parsedDate = new Date(inputDate);
    if (isNaN(parsedDate.getTime())) return 'Invalid date. Please enter a real date.';

    return null; // Valid date
}

module.exports = { validateDate }