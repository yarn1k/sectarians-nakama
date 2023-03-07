let joinOrCreateMatch: nkruntime.RpcFunction = function (context: nkruntime.Context, logger: nkruntime.Logger, nakama: nkruntime.Nakama, payload: string): string
{
    let matches: nkruntime.Match[];
    const MatchesLimit = 10;
    const isAuthoritative = true;
    var label: MatchLabel = { open: true }
    matches = nakama.matchList(MatchesLimit, isAuthoritative, JSON.stringify(label), MinimumPlayers, 1); //MaxPlayers - 1
    if (matches.length > 0)
        return matches[0].matchId;

    return nakama.matchCreate(MatchModuleName);
}
