import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.notice.deleteMany();
  await prisma.beerTransaction.deleteMany();
  await prisma.chairmanAssignment.deleteMany();
  await prisma.gameSession.deleteMany();
  await prisma.playerState.deleteMany();
  await prisma.scoreEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.game.deleteMany();
  await prisma.team.deleteMany();
  await prisma.eventConfig.deleteMany();

  const [spartans, titans] = await Promise.all([
    prisma.team.create({
      data: {
        name: "Spartans",
        slug: "spartans",
        color: "#d8b44b"
      }
    }),
    prisma.team.create({
      data: {
        name: "Titans",
        slug: "titans",
        color: "#1d3557"
      }
    })
  ]);

  const roster = [
    ["Joe Steelman", "joe@olympus.local", spartans.id, "zeus"],
    ["Charlie Arthur", "charlie@olympus.local", spartans.id, "athena"],
    ["Tanner Dinsdale", "tanner@olympus.local", spartans.id, "apollo"],
    ["Stephen Moorkamp", "stephen@olympus.local", spartans.id, "poseidon"],
    ["Jason Falcone", "jason@olympus.local", titans.id, "ares"],
    ["Player 6", "player6@olympus.local", titans.id, "artemis"],
    ["Player 7", "player7@olympus.local", titans.id, "hera"],
    ["Player 8", "player8@olympus.local", titans.id, "hermes"]
  ] as const;

  const users = await Promise.all(
    roster.map(([displayName, email, teamId, avatarKey], index) =>
      prisma.user.create({
        data: {
          displayName,
          email,
          teamId,
          avatarKey,
          role: index === 0 ? "ADMIN" : "PLAYER"
        }
      })
    )
  );

  await prisma.playerState.createMany({
    data: users.map((user) => ({
      userId: user.id,
      beerBalance: 10,
      beersReceived: 0
    }))
  });

  const session = await prisma.gameSession.create({
    data: {
      status: "ACTIVE",
      chairmanId: users[0].id,
      chairmanLocked: true
    }
  });

  await prisma.chairmanAssignment.create({
    data: {
      sessionId: session.id,
      userId: users[0].id
    }
  });

  const games = await Promise.all([
    prisma.game.create({
      data: {
        key: "shooting-targets",
        name: "Shooting: .22 Targets",
        category: "Shooting",
        description: "Five targets scored 5/3/1.",
        sortOrder: 1,
        maxAvailablePoints: 120,
        scoringConfig: {
          style: "target-pips",
          shots: 5,
          tiers: [5, 3, 1]
        }
      }
    }),
    prisma.game.create({
      data: {
        key: "shooting-silhouette",
        name: "Shooting: Silhouette",
        category: "Shooting",
        description: "Nine handgun shots with adjustable ring values.",
        sortOrder: 2,
        maxAvailablePoints: 90,
        scoringConfig: {
          style: "silhouette",
          shots: 9,
          adjustableRings: {
            center: 5,
            torso: 3.5,
            edge: 2
          }
        }
      }
    }),
    prisma.game.create({
      data: {
        key: "golf-match-a",
        name: "Golf Match A",
        category: "Golf",
        description: "9-hole match play scored by holes remaining.",
        sortOrder: 3,
        maxAvailablePoints: 80,
        scoringConfig: {
          style: "match-play",
          teamsPerMatch: 2,
          adjustableHoleValue: 20,
          individualHoleValue: 10,
          maxTeamPoints: 80,
          maxIndividualPoints: 40
        }
      }
    }),
    prisma.game.create({
      data: {
        key: "golf-match-b",
        name: "Golf Match B",
        category: "Golf",
        description: "Second 9-hole match play rotation.",
        sortOrder: 4,
        maxAvailablePoints: 80,
        scoringConfig: {
          style: "match-play",
          teamsPerMatch: 2,
          adjustableHoleValue: 20,
          individualHoleValue: 10,
          maxTeamPoints: 80,
          maxIndividualPoints: 40
        }
      }
    }),
    prisma.game.create({
      data: {
        key: "poker",
        name: "Poker",
        category: "Poker",
        description: "Ranked finish with split team and player awards.",
        sortOrder: 5,
        maxAvailablePoints: 294,
        scoringConfig: {
          style: "placements",
          payouts: [
            { place: 1, team: 100, player: 30 },
            { place: 2, team: 50, player: 25 },
            { place: 3, team: 25, player: 20 },
            { place: 4, team: 15, player: 15 },
            { place: 5, team: 10, player: 10 },
            { place: 6, team: 5, player: 8 },
            { place: 7, team: 2, player: 5 },
            { place: 8, team: 0, player: 0 }
          ]
        }
      }
    })
  ]);

  await prisma.eventConfig.create({
    data: {
      eventName: "Project Olympus",
      winningScore: 500
    }
  });

  await prisma.scoreEntry.createMany({
    data: [
      {
        gameId: games[0].id,
        teamId: spartans.id,
        userId: users[0].id,
        teamPoints: 12,
        playerPoints: 18,
        notes: "Strong opening target run."
      },
      {
        gameId: games[2].id,
        teamId: titans.id,
        userId: users[5].id,
        teamPoints: 20,
        playerPoints: 10,
        notes: "Won 2 up with one to play."
      },
      {
        gameId: games[4].id,
        teamId: spartans.id,
        userId: users[2].id,
        teamPoints: 25,
        playerPoints: 15,
        notes: "Third in poker."
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
