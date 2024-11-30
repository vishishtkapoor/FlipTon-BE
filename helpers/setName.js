
module.exports =  setName = (userData) => {
    let nameString = ""

    if (userData?.firstname) {
        nameString += userData.firstname
    }

    if (userData?.lastname) {
        if (!userData.firstname) {
            nameString = userData.lastname
        } else {
            nameString += ` ${userData.firstname}` //firstname + lastname
        }
    }

    if (!userData?.firstname && !userData?.lastname) {
        if (userData?.username) {
            nameString = userData.username
        } else {
            nameString = "No name"
        }
    }

    return nameString
}

