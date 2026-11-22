package main

import "strconv"

// DArray.map avec conversion de types pré-alloue la tranche de sortie
func MapNumbersToStrings(numbers []float64) []string {
	result := make([]string, len(numbers))
	for i, val := range numbers {
		result[i] = strconv.FormatFloat(val, 'f', -1, 64)
	}
	return result
}
