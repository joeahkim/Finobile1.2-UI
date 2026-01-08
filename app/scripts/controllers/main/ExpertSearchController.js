(function (module) {
    mifosX.controllers = _.extend(module, {
        ExpertSearchController: function (scope, resourceFactory, location, $rootScope, $timeout, localStorageService) {
			var currentUser = localStorageService.getFromLocalStorage("userData");
     		var officeId = currentUser && currentUser.officeId ? currentUser.officeId : null;

        	scope.dashModel = 'dashboard';
            scope.switch = function() {
	        	location.path('/richdashboard');
			};

			scope.totalRevenue = 0;
			scope.revenueGrowth = "0.0";

			resourceFactory.runReportsResource.getReport(
				{ reportSource: "Dashboard_Total_Revenue",
					R_officeId: officeId,
					genericResultSet: true,},
				function (data) {
				if (data.data && data.data.length > 0) {
					const row = data.data[0].row;

					scope.totalRevenue = parseFloat(row[0]) || 0;
					scope.revenueGrowth = parseFloat(row[3]).toFixed(1);
				}
				},
				function (error) {
				console.error("Total Revenue report error:", error);
				}
			);

			scope.activeLoans = 0;
			scope.activeLoansGrowth = "0";

			resourceFactory.runReportsResource.getReport(
				{
				reportSource: "Dashboard_Active_Loans",
				R_officeId: officeId,
				genericResultSet: true,
				},
				function (data) {
				if (data.data && data.data.length > 0) {
					const row = data.data[0].row;
					scope.activeLoans = parseInt(row[0]) || 0;
					scope.activeLoansGrowth = parseFloat(row[2]).toFixed(1);
				}
				},
				function (error) {
				console.error("Active Loans report error:", error);
				}
			);
			

			scope.currentMonthDisbursements = 0;
			scope.lastMonthDisbursements = 0;
			scope.disbursementsGrowth = 0;

			resourceFactory.runReportsResource.getReport(
				{
				reportSource: "Dashboard_Disbursements",
				R_officeId: officeId,
				genericResultSet: true,
				},
				function (data) {
				if (data.data && data.data.length > 0) {
					const row = data.data[0].row;

					scope.currentMonthDisbursements = parseFloat(row[0]) || 0;
					scope.lastMonthDisbursements = parseFloat(row[1]) || 0;

					let growth = 0;
					if (scope.lastMonthDisbursements > 0) {
					growth =
						((scope.currentMonthDisbursements -
						scope.lastMonthDisbursements) /
						scope.lastMonthDisbursements) *
						100;
					} else if (scope.currentMonthDisbursements > 0) {
					growth = 100;
					}
					scope.disbursementsGrowth = growth.toFixed(1);
				}
				},
				function (error) {
				console.error("Dashboard_Disbursements report failed:", error);
				}
			);


			scope.collectionRate = 0;
			scope.collectionRateGrowth = 0;

			resourceFactory.runReportsResource.getReport(
				{
				reportSource: "Dashboard_Collection_Rate",
				R_officeId: officeId,
				genericResultSet: true,
				},
				function (data) {
				const row = data.data[0].row;
				scope.collectionRate = parseFloat(row[6]).toFixed(1);
				scope.collectionRateGrowth = parseFloat(row[9]).toFixed(1);
				},
				function (error) {
				console.error("Collection Rate API Error:", error);
				}
			);

			scope.graphView = "revenue";
			scope.portfolioMonths = [];
			scope.portfolioValues = [];

			scope.loadPortfolioRevenue = function () {
				resourceFactory.runReportsResource.getReport(
				{
					reportSource: "Dashboard_Portfolio_Revenue",
					R_officeId: officeId,
					genericResultSet: true,
				},
				function (data) {
					scope.portfolioMonths = [];
					scope.portfolioValues = [];

					data.data.forEach(function (item) {
					scope.portfolioMonths.push(item.row[0]);
					scope.portfolioValues.push(parseFloat(item.row[2]));
					});

					scope.renderPortfolioChart();
				},
				function (error) {
					console.error("Portfolio Revenue Error:", error);
				}
				);
			};

			scope.loadPortfolioExpenses = function () {
				resourceFactory.runReportsResource.getReport(
				{
					reportSource: "Dashboard_Portfolio_Expenses",
					R_officeId: officeId,
					genericResultSet: true,
				},
				function (data) {
					scope.portfolioMonths = [];
					scope.portfolioValues = [];

					data.data.forEach(function (item) {
					scope.portfolioMonths.push(item.row[0]);
					scope.portfolioValues.push(parseFloat(item.row[2]) || 0);
					});

					scope.renderPortfolioChart();
				},
				function (error) {
					console.error("Portfolio Expenses Error:", error);
				}
				);
			};

			scope.setGraphView = function (type) {
				scope.graphView = type;

				if (type === "revenue") {
				scope.currentChartLabel = "Revenue";
				scope.currentChartColor = "#1A1F71";
				scope.loadPortfolioRevenue();
				} else {
				scope.currentChartLabel = "Expenses";
				scope.currentChartColor = "#7C2D12";
				scope.loadPortfolioExpenses();
				}
			};

			let portfolioChart = null;

			scope.renderPortfolioChart = function () {
				$timeout(function () {
				const canvas = document.getElementById("portfolioChart");
				if (!canvas) return;

				const ctx = canvas.getContext("2d");

				const existingChart = Chart.getChart(canvas);
				if (existingChart) {
					existingChart.destroy();
				}

				const gradient = ctx.createLinearGradient(0, 0, 0, 260);
				gradient.addColorStop(
					0,
					scope.graphView === "revenue"
					? "rgba(26, 31, 113, 0.28)"
					: "rgba(124, 45, 18, 0.28)"
				);
				gradient.addColorStop(1, "rgba(0,0,0,0)");

				portfolioChart = new Chart(ctx, {
					type: "line",
					data: {
					labels: scope.portfolioMonths,
					datasets: [
						{
						label: scope.currentChartLabel,
						data: scope.portfolioValues,
						borderColor: scope.currentChartColor,
						backgroundColor: gradient,
						fill: true,
						tension: 0.42,
						borderWidth: 2,
						pointRadius: 2.5,
						pointBackgroundColor: scope.currentChartColor,
						pointBorderWidth: 0,
						},
					],
					},
					options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
					},
					scales: {
						x: {
						grid: { display: false },
						ticks: { color: "#6b7280", font: { size: 11 } },
						},
						y: {
						grid: { display: false },
						ticks: {
							color: "#6b7280",
							callback: (v) => (v === 0 ? "0" : v / 1000 + "k"),
						},
						},
					},
					},
				});
				}, 0);
			};

			scope.loadPortfolioRevenue();

           
            scope.searchParams = ['create client', 'clients', 'create group', 'groups', 'centers', 'create center', 'configuration', 'tasks', 'templates', 'system users',
                                  'create template', 'create loan product', 'create saving product', 'roles', 'add role', 'configure maker checker tasks',
                                  'users', 'loan products', 'charges', 'saving products', 'offices', 'create office', 'currency configurations', 'user settings',
                                  'create user', 'employees', 'create employee', 'manage funds', 'offices', 'chart of accounts', 'frequent postings', 'Journal entry',
                                  'search transaction', 'account closure', 'accounting rules', 'add accounting rule', 'data tables', 'create data table', 'add code',
                                  'jobs', 'codes', 'reports', 'create report', 'holidays', 'create holiday', 'create charge', 'product mix', 'add member', 'add product mix',
                                  'bulk loan reassignment', 'audit', 'create accounting closure', 'enter collection sheet', 'navigation', 'accounting', 'organization', 'system'];
            scope.search = function () {
		      switch (this.formData.search) {
		          case 'create client':
		              location.path('/createclient');
		              break;
		          case 'clients':
		              location.path('/clients');
		              break;
		          case 'create group':
		              location.path('/creategroup');
		              break;
		          case 'groups':
		              location.path('/groups');
		              break;
		          case 'create center':
		              location.path('/createcenter');
		              break;
		          case 'centers':
		              location.path('/centers');
		              break;
		          case 'configuration':
		              location.path('/global');
		              break;
		          case 'tasks':
		              location.path('/tasks');
		              break;
		          case 'templates':
		              location.path('/templates');
		              break;
		          case 'create template':
		              location.path('/createtemplate');
		              break;
		          case 'create loan product':
		              location.path('/createloanproduct');
		              break;
		          case 'create saving product':
		              location.path('/createsavingproduct');
		              break;
		          case 'roles':
		              location.path('/admin/roles');
		              break;
		          case 'add role':
		              location.path('/admin/addrole');
		              break;
		          case 'configure maker checker tasks':
		              location.path('/admin/viewmctasks');
		              break;
		          case 'loan products':
		              location.path('/loanproducts');
		              break;
		          case 'charges':
		              location.path('/charges');
		              break;
		          case 'saving products':
		              location.path('/savingproducts');
		              break;
		          case 'offices':
		              location.path('/offices');
		              break;
		          case 'create office':
		              location.path('/createoffice');
		              break;
		          case 'currency configurations':
		              location.path('/currconfig');
		              break;
		          case 'user settings':
		              location.path('/usersetting');
		              break;
		          case 'employees':
		              location.path('/employees');
		              break;
		          case 'create employee':
		              location.path('/createemployee');
		              break;
		          case 'manage funds':
		              location.path('/managefunds');
		              break;
		          case 'chart of accounts':
		              location.path('/accounting_coa');
		              break;
		          case 'frequent postings':
		              location.path('/freqposting');
		              break;
		          case 'journal entry':
		              location.path('/journalentry');
		              break;
		          case 'search transaction':
		              location.path('/searchtransaction');
		              break;
		          case 'account closure':
		              location.path('/accounts_closure');
		              break;
		          case 'accounting rules':
		              location.path('/accounting_rules');
		              break;
		          case 'add accounting rule':
		              location.path('/add_accrule');
		              break;
		          case 'data tables':
		              location.path('/datatables');
		              break;
		          case 'create data table':
		              location.path('/createdatatable');
		              break;
		          case 'add code':
		              location.path('/addcode');
		              break;
		          case 'jobs':
		              location.path('/jobs');
		              break;
		          case 'codes':
		              location.path('/codes');
		              break;
		          case 'reports':
		              location.path('/reports');
		              break;
		          case 'create report':
		              location.path('/createreport');
		              break;
		          case 'holidays':
		              location.path('/holidays');
		              break;
		          case 'create holiday':
		              location.path('/createholiday');
		              break;
		          case 'add member':
		              location.path('/addmember');
		              break;
		          case 'create charge':
		              location.path('/createcharge');
		              break;
		          case 'enter collection sheet':
		              location.path('/entercollectionsheet');
		              break;
		          case 'product mix':
		              location.path('/productmix');
		              break;
		          case 'add product mix':
		              location.path('/addproductmix');
		              break;
		          case 'bulk loan reassignment':
		              location.path('/bulkloan');
		              break;
		          case 'audit':
		              location.path('/audit');
		              break;
		          case 'create accounting closure':
		              location.path('/createclosure');
		              break;
		          case 'navigation':
		              location.path('/nav/offices');
		              break;
		          case 'accounting':
		              location.path('/accounting');
		              break;
		          case 'organization':
		              location.path('/organization');
		              break;
		          case 'system':
		              location.path('/system');
		              break;
		          case 'system users':
		              location.path('/admin/users');
		              break;
		          default:
		              location.path('/home');
		      }
            }

        }

    });
    mifosX.ng.application.controller('ExpertSearchController', ['$scope', 'ResourceFactory', '$location', "$rootScope", "$timeout", "localStorageService", mifosX.controllers.ExpertSearchController]).run(function ($log) {
        $log.info("ExpertSearchController initialized");
    });
}(mifosX.controllers || {}));

