interface MatchLabel
{
    open: boolean
}

interface GameState
{
    players: Player[]
    playersMoney: number[]
    checkChangeMoney: number[][]
    roundDeclaredWins: number[][]
    scene: Scene
    countdown: number
    endMatch: boolean
}

interface Player
{
    presence: nkruntime.Presence
    displayName: string
    isPaid: boolean
}

interface TimeRemainingData
{
    time: number
}

interface PlayerMoneyData
{
    tick: number
    playerNumber: number
    money: number
}

interface PlayerWonData
{
    tick: number
    playerNumber: number
}

interface TrophiesData
{
    amount: number
}
