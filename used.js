for (let i = 2; i < 5; i++) {
    console.log(i);
}

let i = 2;
while (i < 5) {
    console.log(i);
    i++
}


const person = {
    name: "Dmytro",
    friend: {
        name: "Jaison",
        friend: {
            name: "Samy"
        }
    }
}




// while loop

let currentPerson = person
while (currentPerson.friend != null) {
    console.log(currentPerson.friend.name);
    currentPerson = currentPerson.friend;
}

// 07.10.26


function printNumber(number) {
    if (number > 10) return

    console.log(number)
    printNumber(number + 1)
    console.log("exiting function")

}

printNumber(1)



let sum = 0;
for (let i = 1; i < 10; i++) {
    sum = sum + i;
}

console.log(sum)



// Recursion
function sumNumberBelow(number) {
    if (number <= 0) return 0;
    return number + sumNumberBelow(number - 1);
}

console.log(sumNumberBelow(2))



console.log(printFalse() || printTrue());

function printTrue() {
    console.log("true")
    return true
}

function printFalse() {
    console.log("false")
    return false
}



function printName(name) {
    if (name == null) {
        name = "Default"
    }

    console.log(name)
}

printName()