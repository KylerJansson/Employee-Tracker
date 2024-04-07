const inquirer = require('inquirer');
const db = require('./server');

function mainMenu() {
    inquirer.prompt({
        name: 'action',
        type: 'list',
        message: 'What would you like to do?',
        choices: [
            'View all departments',
            'Add a department',
            'View all roles',
            'Add a role',
            'View all employees',
            'Add an employee',
            'Update an employee role',
            'Exit'
        ],
    }).then((answer) => {

        if (answer.action === 'View all departments') {
            viewAllDepartments();
        } else if (answer.action === 'Add a department') {
            addDepartment();
        } else if (answer.action === 'View all roles') {
            viewAllRoles();
        } else if (answer.action === 'Add a role') {
            addRole();
        } else if (answer.action === 'View all employees') {
            viewAllEmployees();
        } else if (answer.action === 'Add an employee') {
            addEmployee();
        } else if (answer.action === 'Update an employee role') {
            updateEmployeeRole();
        } else if (answer.action === 'Exit') {
            console.log('Goodbye!');
            db.end();
        } else {
            mainMenu();
        }
    }).catch((error) => {
        console.error('Error:', error);
    });
}

function viewAllDepartments() {
    db.query('SELECT * FROM department', (err, results) => {
        if (err) throw err;
        console.table(results);
        mainMenu();
    });
}

function addDepartment() {
    inquirer.prompt([
        {
            name: 'departmentName',
            type: 'input',
            message: 'What is the name of the new department?',
            validate: input => input.length > 0 || 'Please enter a department name.'
        }
    ]).then((answer) => {
        const query = 'INSERT INTO department (name) VALUES (?)';
        db.query(query, [answer.departmentName], (err, res) => {
            if (err) throw err;
            console.log(`New department (${answer.departmentName}) was added.`);
            mainMenu();
        });
    }).catch((error) => {
        console.error('Error adding department:', error);
    });
}

function viewAllRoles() {
    const query = `SELECT role.id, role.title, department.name AS department, role.salary FROM role
    JOIN department ON role.department_id = department.id`;
    db.query(query, (err, results) => {
        if (err) throw err;
        console.table(results);
        mainMenu();
    });
}

function addRole() {
    db.query('SELECT id, name FROM department', async (err, departments) => {
        if (err) throw err;

        const departmentChoices = departments.map(department => ({
            name: department.name,
            value: department.id
        }));

        const answers = await inquirer.prompt([
            {
                name: 'title',
                type: 'input',
                message: 'What is the title of the new role?',
                validate: input => input.length > 0 || 'Please enter a role title.'
            },
            {
                name: 'salary',
                type: 'input',
                message: 'What is the salary of the new role?',
                validate: input => {
                    const salary = parseInt(input, 10);
                    if (!isNaN(salary) && salary > 0) {
                        return true;
                    }
                    return 'Please enter a positive number for salary.';
                }
            },
            {
                name: 'departmentId',
                type: 'list',
                message: 'Which department does the role belong to?',
                choices: departmentChoices
            }
        ]);

        const query = 'INSERT INTO role (title, salary, department_id) VALUES (?, ?, ?)';
        db.query(query, [answers.title, answers.salary, answers.departmentId], (err, res) => {
            if (err) throw err;
            console.log(`New role (${answers.title}) was added.`);
            mainMenu();
        });
    });
}


async function viewAllEmployees() {
    try {
        const query = `
            SELECT 
                employee.id, 
                employee.first_name, 
                employee.last_name, 
                role.title AS role_title, 
                department.name AS department_name, 
                role.salary, 
                CONCAT(manager.first_name, ' ', manager.last_name) AS manager_name
            FROM employee
            LEFT JOIN employee AS manager ON employee.manager_id = manager.id
            JOIN role ON employee.role_id = role.id
            JOIN department ON role.department_id = department.id
        `;
        const [results] = await db.promise().query(query);
        console.table(results);
    } catch (err) {
        console.error('Error viewing all employees:', err);
    }
    mainMenu();
}


function addEmployee() {
    db.query('SELECT id, title FROM role', async (err, roles) => {
        if (err) throw err;
        const [employees] = await db.promise().query("SELECT employee.id, CONCAT(employee.first_name, ' ', employee.last_name) AS name FROM employee");

        const roleChoices = roles.map(role => ({
            name: role.title,
            value: role.id
        }));

        const managerChoice = employees.map(employee => ({
            name: employee.name,
            value: employee.id
        }));
        managerChoice.unshift({ name: "None", value: null })

        const answers = await inquirer.prompt([
            {
                name: 'firstName',
                type: 'input',
                message: "What is the employee's first name?",
                validate: input => input.length > 0 || 'Please enter a first name.'
            },
            {
                name: 'lastName',
                type: 'input',
                message: "What is the employee's last name?",
                validate: input => input.length > 0 || 'Please enter a last name.'
            },
            {
                name: 'roleId',
                type: 'list',
                message: "What is the employee's role?",
                choices: roleChoices
            },
            {
                name: 'managerId',
                type: 'list',
                message: "Who is the employee's manager?",
                choices: managerChoice
            }
        ])
        const query = 'INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)';
        db.query(query, [answers.firstName, answers.lastName, answers.roleId, answers.managerId || null], (err, res) => {
            if (err) throw err;
            console.log(`New employee (${answers.firstName} ${answers.lastName}) was added.`);
            mainMenu();
        });
    });
};

async function updateEmployeeRole() {
    try {
        const [employees] = await db.promise().query("SELECT employee.id, CONCAT(employee.first_name, ' ', employee.last_name) AS name FROM employee");

        const employeeChoices = employees.map(employee => ({
            name: employee.name,
            value: employee.id
        }));

        const { employeeId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'employeeId',
                message: 'Which employee\'s role do you want to update?',
                choices: employeeChoices
            }
        ]);

        const [roles] = await db.promise().query("SELECT id, title FROM role");

        const roleChoices = roles.map(role => ({
            name: role.title,
            value: role.id
        }));

        const { roleId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'roleId',
                message: 'What is the new role of the employee?',
                choices: roleChoices
            }
        ]);

        const managerChoice = employees.map(employee => ({
            name: employee.name,
            value: employee.id
        }));

        managerChoice.unshift({ name: "None", value: null })

        const { managerId } = await inquirer.prompt({
            type: 'list',
            name: 'managerId',
            message: "Who is the employee's new Manager?",
            choices: managerChoice
        });

        await db.promise().query("UPDATE employee SET role_id = ?, manager_id = ? WHERE id = ?", [roleId, managerId || null, employeeId]);

        console.log('Employee role updated successfully.');
    } catch (error) {
        console.error('Error updating employee role:', error);
    }

    mainMenu();
}




mainMenu();