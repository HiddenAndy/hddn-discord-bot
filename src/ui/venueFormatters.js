export function formatVenueList(gathering, emptyText = '- 아직 후보 장소가 없어요.') {
  if (gathering.venueOptions.length === 0) {
    return emptyText;
  }

  return gathering.venueOptions.map((venue) => {
    const voteCount = Object.values(gathering.votes || {}).filter((votedVenue) => votedVenue === venue.name).length;
    const venueUrl = venue.venueUrl ? ` - ${venue.venueUrl}` : '';
    const description = venue.description ? `\n  ${venue.description.replace(/\n/g, '\n  ')}` : '';
    return `- ${venue.name}: ${voteCount}표${venueUrl}${description}`;
  }).join('\n');
}
