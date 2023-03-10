interface MatchLabel
{
    open: boolean
}

interface GameState
{
    players: Player[]
    playersMoney: number[]
    scene: Scene
    countdown: number
    draw: boolean
    endMatch: boolean
}

interface Player
{
    presence: nkruntime.Presence
    displayName: string
    isPaid: boolean
}

/*
interface TimeRemainingData
{
    time: number
}
*/

interface PlayerMoneyData
{
    tick: number
    playerNumber: number
    amount: number
}

interface PlayerWonData
{
    tick: number
    playerNumber: number
}
