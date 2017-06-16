import moment from 'moment';
import distance from 'turf-distance';

export function computeFilteredEvents(events, filters, zipcodes) {
  // Bail out early if possible. Huge array!
  if (!Object.keys(filters).length) {
    return events;
  }

  const zipcodesLength = Object.keys(zipcodes).length;
  const validZipcode = zipcodesLength && !!zipcodes[filters.zipcode];

  // A zipcode is selected but either we do not yet have valid zipcodes
  // to check it against and get its coords, or the zipcode is invalid;
  // either way there can be no valid events. Bail early.
  if (filters.zipcode && (!zipcodesLength || !validZipcode)) {
    return [];
  }

  var hasFilterOnEventType = false;
  var hasFilterOnEventDate = false;
  var hasFilterOnEventZip = false;


  const filteredEvents = events.filter(event => {

    if (filters.eventType) {
      hasFilterOnEventType = true;
      const eventCategories = event.categories ?
        event.categories.split(',') : [];

      // The UI lumps into "event types" what are mostly "categories"
      // in ActionKit, with this one exception, the is_official
      // boolean field, so we will just pretend it is a category.
      if (event.is_official) {
        eventCategories.push('aclu');
      }

      if (!eventCategories.length) {
        return false;
      }

      const selectedEventTypes = filters.eventType.split(',');

      const eventMatchesNoSelectedTypes = selectedEventTypes.every(
        type => !eventCategories.includes(type)
      );

      if (eventMatchesNoSelectedTypes) {
        return false;
      }
    }

    // note: there is also a utc timestamp, this one is localized
    const localDatetime = moment(event.start_datetime);

    if (filters.startDate) {
      hasFilterOnEventDate = true;
      const startDate = moment(filters.startDate, 'YYYY-MM-DD');

      if (localDatetime.isBefore(startDate, 'day')) {
        return false;
      }
    }

    if (filters.endDate) {
      hasFilterOnEventDate = true;

      const endDate = moment(filters.endDate, 'YYYY-MM-DD');

      if (localDatetime.isAfter(endDate, 'day')) {
        return false;
      }
    }

    if (filters.zipcode) {
      hasFilterOnEventZip = true;

      const milesFromZipcode = distance(
        zipcodes[filters.zipcode], [event.lng, event.lat],
        'miles'
      );

      const MAX_MILES_FROM_ZIPCODE = 100;

      if (milesFromZipcode > MAX_MILES_FROM_ZIPCODE) {
        return false;
      }
    }

    return true;
  });

  // When a zipcode is selected, sort events by proximity to that zipcode.
  if (filters.zipcode) {
    hasFilterOnEventZip = true;
    filteredEvents.sort((a, b) => {
      const distanceFromA = distance(zipcodes[filters.zipcode], [a.lng, a.lat]);
      const distanceFromB = distance(zipcodes[filters.zipcode], [b.lng, b.lat]);

      return distanceFromA - distanceFromB;
    });

  }

  var warningText = document.getElementById("eventsAreFilteredText");
  var nbFilteredEvents = events.length - filteredEvents.length;
  if (nbFilteredEvents > 0) {
    warningText.innerHTML = nbFilteredEvents + " events are filtered.";
    warningText.style.visibility = "visible";

  }
  else {
    warningText.style.visibility = "hidden";
  }
  if (hasFilterOnEventType) {
    /* var eventTypeButton = document.getElementById("eventTypes");
     eventTypeButton.set*/
    // TODO :)
  }

  return filteredEvents;
}
