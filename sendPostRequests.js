const request = require('request')

const data = [
  {
    positionId: 2,
    password: 'v5kzD3U2DrM5WNVb',
    confirm: 'v5kzD3U2DrM5WNVb',
    contracts: [
      {
        currencyId: 4,
        currencyAmount: 700000,
        availabilityInHours: 40,
        contractId: 1
      }
    ],
    locations: ['ChIJyc_U0TTDQUcRYBEeDCnEAAQ'],
    workExperiences: [],
    languages: [
      {
        languageLevelId: 4,
        languageId: 62
      },
      {
        languageLevelId: 2,
        languageId: 38
      }
    ],
    locationRemoteProviderId: 'ChIJNaB-QIe_a0cR4BEeDCnEAAQ',
    specialisations: [
      {
        specialisationLevelId: 3,
        specialisationId: 6
      }
    ],
    skills: [
      {
        skillLevelId: 2,
        skillId: 30
      },
      {
        skillLevelId: 1,
        skillId: 27
      }
    ],
    jobStatusId: 2,
    email: 'waelsy123+hehe@gmail.com'
  }
]

const sendRequest = candidate => {
  request.post(
    'https://techloop-api-staging.herokuapp.com/guest/candidate-signup',
    { json: { ...candidate, email: 'waelsy123+hehe@gmail.com' } },
    (error, response, body) => {
      console.log(response.statusCode)

      if (!error && response.statusCode == 200) {
        console.log(body)
      }
    }
  )
}

data.map(candidate => {
  sendRequest(candidate)
})
